import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

function readEnv() {
  if (!fs.existsSync('.env')) return {};

  return Object.fromEntries(
    fs
      .readFileSync('.env', 'utf8')
      .split(/\r?\n/)
      .filter((line) => line.trim() && !line.trim().startsWith('#'))
      .map((line) => {
        const index = line.indexOf('=');
        return [line.slice(0, index), line.slice(index + 1)];
      }),
  );
}

function readSupabaseConfig() {
  const seedScript = fs.readFileSync('scripts/seed-exercises.js', 'utf8');
  const url = seedScript.match(/const SUPABASE_URL = '([^']+)'/)?.[1];
  const key = seedScript.match(/const SUPABASE_KEY =\s*\n  '([^']+)'/)?.[1];

  if (!url || !key) {
    throw new Error('Could not read Supabase config from scripts/seed-exercises.js');
  }

  return { url, key };
}

function collectTextValues(value) {
  if (value == null) return [];
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(collectTextValues);
  if (typeof value === 'object') return Object.values(value).flatMap(collectTextValues);
  return [];
}

function needsJapaneseNormalization(value) {
  return /[\u00C0-\u1EF9]|\?|[A-Za-z]{3,}|\b(nghe|chon|dich|doc|cau|bai|doan|tieng viet)\b/i.test(
    collectTextValues(value).join('\n'),
  );
}

function chunk(items, size) {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function buildPrompt(rows) {
  return `次の日本語学習用の練習問題を、すべて自然な日本語に統一してください。

厳守ルール:
- JSONのみを返してください。
- idは必ずそのまま保持してください。
- title, instructions, questions[].prompt, questions[].choices, answer_key の値を日本語にしてください。
- contentが日本語の本文や会話なら、意味を変えずにそのまま、または自然な日本語に整えてください。
- ベトナム語、英語、文字化けしたベトナム語は日本語に直してください。
- 「ベトナム語を日本語に訳す」形式の問題は残さず、日本語の穴埋め・選択・言い換え問題に作り直してください。
- answer_keyに英語やベトナム語がある場合は、日本語の正答に置き換えてください。
- choicesに英語やベトナム語がある場合は、日本語の選択肢に置き換えてください。
- 問題の数、question id、choices配列の形式、answer_keyのキーは変えないでください。
- choicesが空配列の自由回答問題は、choicesを空配列のままにしてください。
- 固有名詞は必要に応じてそのまま残して構いません。

入力:
${JSON.stringify(
  rows.map((row) => ({
    id: row.id,
    type: row.type,
    title: row.title,
    instructions: row.instructions,
    content: row.content,
    questions: row.questions,
    answer_key: row.answer_key,
  })),
)}

返却形式:
{
  "rows": [
    {
      "id": "...",
      "title": "...",
      "instructions": "...",
      "content": "...",
      "questions": [{"id":"...","prompt":"...","choices":[]}],
      "answer_key": {"q1":"..."}
    }
  ]
}`;
}

async function normalizeBatch({ apiKey, model, rows }) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: buildPrompt(rows) }] }],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: 'application/json',
        },
      }),
    },
  );

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error?.message || 'Gemini request failed');
  }

  const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('Gemini did not return JSON');
  }

  const trimmed = text.trim();
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('Gemini response did not contain a JSON object');
  }

  return JSON.parse(trimmed.slice(start, end + 1)).rows || [];
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function normalizeBatchWithRetry(params) {
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      return await normalizeBatch(params);
    } catch (error) {
      if (attempt === 4) throw error;

      const waitMs = 5000 * attempt;
      console.log(`Batch failed (${error.message}). Retrying in ${waitMs / 1000}s...`);
      await sleep(waitMs);
    }
  }
}

async function main() {
  const env = readEnv();
  const apiKey = env.VITE_GEMINI_API_KEY;
  const model = env.VITE_GEMINI_MODEL || 'gemini-2.5-flash';

  if (!apiKey) {
    throw new Error('Missing VITE_GEMINI_API_KEY in .env');
  }

  const { url, key } = readSupabaseConfig();
  const supabase = createClient(url, key);

  const { data, error } = await supabase
    .from('lesson_exercises')
    .select('id,type,title,instructions,content,questions,answer_key')
    .order('created_at', { ascending: true });

  if (error) throw error;

  const targets = (data || []).filter(needsJapaneseNormalization);
  console.log(`Normalizing ${targets.length}/${data.length} exercises to Japanese`);

  let updated = 0;
  for (const [batchIndex, rows] of chunk(targets, 4).entries()) {
    const normalizedRows = await normalizeBatchWithRetry({ apiKey, model, rows });

    for (const row of normalizedRows) {
      const { error: updateError } = await supabase
        .from('lesson_exercises')
        .update({
          title: row.title,
          instructions: row.instructions,
          content: row.content,
          questions: row.questions,
          answer_key: row.answer_key,
        })
        .eq('id', row.id);

      if (updateError) throw updateError;
      updated += 1;
    }

    console.log(`Batch ${batchIndex + 1}: updated ${updated}/${targets.length}`);
  }

  console.log(`Done. Updated ${updated} exercises.`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://nfdnxysmeeklxodkbqqd.supabase.co';
const SUPABASE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5mZG54eXNtZWVrbHhvZGticXFkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDE5OTAxNSwiZXhwIjoyMDk1Nzc1MDE1fQ.Dv5ZpFLx_d022JYDIjYw-2KSIpL6v-nt1V1sWZGoFms';

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

function compact(items, formatter, limit) {
  return items.slice(0, limit).map(formatter).join('\n');
}

const exerciseSchema = {
  type: 'OBJECT',
  properties: {
    exercises: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          type: { type: 'STRING', enum: ['reading', 'listening', 'practice'] },
          title: { type: 'STRING' },
          instructions: { type: 'STRING' },
          content: { type: 'STRING' },
          questions: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                id: { type: 'STRING' },
                prompt: { type: 'STRING' },
                choices: { type: 'ARRAY', items: { type: 'STRING' } },
              },
              required: ['id', 'prompt', 'choices'],
            },
          },
          answer_key: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                id: { type: 'STRING' },
                answer: { type: 'STRING' },
              },
              required: ['id', 'answer'],
            },
          },
        },
        required: ['type', 'title', 'instructions', 'content', 'questions', 'answer_key'],
      },
    },
  },
  required: ['exercises'],
};

function buildPrompt({ lesson, vocabulary, grammar, kanji }) {
  const vocab = compact(
    vocabulary,
    (item) => `- ${item.word}${item.furigana ? ` (${item.furigana})` : ''}: ${item.meaning}`,
    24,
  );
  const grammarText = compact(
    grammar,
    (item) => `- ${item.title}: ${item.structure || ''}. ${item.explanation || ''}`,
    12,
  );
  const kanjiText = compact(
    kanji,
    (item) => `- ${item.character}: ${item.meaning}; onyomi ${item.onyomi || '-'}; kunyomi ${item.kunyomi || '-'}`,
    16,
  );

  return `Create original Japanese learning exercises for this lesson.
Do not copy external materials. Use only the lesson content below.
Return Vietnamese-friendly instructions and answer explanations where useful.

Lesson: ${lesson.title}
Description: ${lesson.description || ''}
JLPT: ${lesson.jlpt_level || ''}

Vocabulary:
${vocab || '- none'}

Grammar:
${grammarText || '- none'}

Kanji:
${kanjiText || '- none'}

Create exactly 3 exercises:
1. one reading exercise with a short Japanese passage and 4 questions.
2. one listening exercise with a short Japanese dialogue transcript in content and 4 questions. Do not include audio_url.
3. one practice exercise with transformation/matching/translation style tasks and 5 questions.

Each question must have a stable id like q1, q2, q3.
Use choices for multiple-choice questions; use an empty choices array for free-answer questions.
answer_key must contain one item per question id with the exact correct answer.`;
}

async function generateExercises({ apiKey, model, lesson, vocabulary, grammar, kanji }) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: buildPrompt({ lesson, vocabulary, grammar, kanji }) }] }],
        generationConfig: {
          temperature: 0.45,
          responseMimeType: 'application/json',
          responseSchema: exerciseSchema,
        },
      }),
    },
  );

  const result = await response.json();

  if (!response.ok) {
    const message = result.error?.message || 'Gemini request failed';
    const retryMatch = message.match(/retry in ([0-9.]+)s/i);
    const retryAfterSeconds = retryMatch ? Math.ceil(Number(retryMatch[1])) : 70;
    const error = new Error(message);
    error.retryAfterMs = retryAfterSeconds * 1000;
    throw error;
  }

  const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Gemini did not return exercise JSON');

  return JSON.parse(text).exercises || [];
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function generateExercisesWithRetry(params) {
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      return await generateExercises(params);
    } catch (error) {
      if (!error.message.includes('quota') || attempt === 4) {
        throw error;
      }

      const waitMs = error.retryAfterMs || 70000;
      console.log(`Quota reached. Waiting ${Math.ceil(waitMs / 1000)}s before retry...`);
      await sleep(waitMs + 5000);
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

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  const { data: lessons, error: lessonsError } = await supabase
    .from('lessons')
    .select('id,title,description,jlpt_level')
    .order('created_at');

  if (lessonsError) throw lessonsError;

  for (const [index, lesson] of lessons.entries()) {
    const { count } = await supabase
      .from('lesson_exercises')
      .select('id', { count: 'exact', head: true })
      .eq('lesson_id', lesson.id);

    if ((count || 0) > 0) {
      console.log(`[${index + 1}/${lessons.length}] Skip ${lesson.title}: already has ${count} exercises`);
      continue;
    }

    const [vocabularyResult, grammarResult, kanjiResult] = await Promise.all([
      supabase.from('vocabulary').select('word,furigana,meaning').eq('lesson_id', lesson.id),
      supabase.from('grammar').select('title,structure,explanation').eq('lesson_id', lesson.id),
      supabase.from('kanji').select('character,onyomi,kunyomi,meaning').eq('lesson_id', lesson.id),
    ]);

    const exercises = await generateExercisesWithRetry({
      apiKey,
      model,
      lesson,
      vocabulary: vocabularyResult.data || [],
      grammar: grammarResult.data || [],
      kanji: kanjiResult.data || [],
    });

    const rows = exercises.map((exercise) => ({
      lesson_id: lesson.id,
      type: exercise.type,
      title: exercise.title,
      instructions: exercise.instructions,
      content: exercise.content,
      questions: exercise.questions,
      answer_key: Object.fromEntries(
        (exercise.answer_key || []).map((item) => [item.id, item.answer]),
      ),
    }));

    const { error: insertError } = await supabase.from('lesson_exercises').insert(rows);
    if (insertError) throw insertError;

    console.log(`[${index + 1}/${lessons.length}] Added ${rows.length} exercises: ${lesson.title}`);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

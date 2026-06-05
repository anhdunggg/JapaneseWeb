import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const seed = fs.readFileSync('scripts/seed-exercises.js', 'utf8');
const url = seed.match(/const SUPABASE_URL = '([^']+)'/)?.[1];
const key = seed.match(/const SUPABASE_KEY =\s*\n  '([^']+)'/)?.[1];
const supabase = createClient(url, key);

async function update(id, updater) {
  const { data, error } = await supabase
    .from('lesson_exercises')
    .select('questions,answer_key')
    .eq('id', id)
    .single();

  if (error) throw error;

  const next = updater(data);
  const { error: updateError } = await supabase
    .from('lesson_exercises')
    .update(next)
    .eq('id', id);

  if (updateError) throw updateError;
  console.log(`updated ${id}`);
}

await update('84589da8-14e1-4aa6-af51-6173f0528a33', (row) => ({
  questions: row.questions.map((question) => {
    if (question.id === 'p4') {
      return {
        ...question,
        prompt:
          '「私は月曜日から金曜日まで働きます。」を、同じ意味の別の日本語に言い換えてください。',
      };
    }

    return question;
  }),
  answer_key: {
    ...row.answer_key,
    p4: '月曜日から金曜日まで仕事をします。',
    p5: 'ぎんこう',
  },
}));

await update('4814e66b-5dae-4bbf-a7d0-2c7dd0fe6fc2', (row) => ({
  questions: row.questions.map((question) => {
    if (question.id === 'q1') {
      return {
        ...question,
        prompt: '「バスでスーパーへ行きます。」という文を作りなさい。',
      };
    }

    if (question.id === 'q2') {
      return {
        ...question,
        prompt: '「来月、友達と家へ帰ります。」という文を作りなさい。',
      };
    }

    return question;
  }),
  answer_key: row.answer_key,
}));

await update('dda7c82b-a793-444b-ab96-da9cce2c37c9', (row) => ({
  questions: row.questions.map((question) => {
    if (question.id === 'q1-explanation') {
      return {
        ...question,
        prompt:
          '解説：グループ1の動詞は、「ます」を取り、イ段をオ段に変えて「う」を付けます。',
      };
    }

    return question;
  }),
  answer_key: row.answer_key,
}));

for (const id of [
  'a85d6497-7698-4551-b00a-ad605855f6cb',
  'ad2a05e4-980f-423b-93c5-edeb611b313d',
  '3d28f722-702f-4532-ae20-df998bb48957',
]) {
  await update(id, (row) => ({
    questions: row.questions.map((question) => ({
      ...question,
      prompt:
        typeof question.prompt === 'string'
          ? question.prompt.replaceAll('???????', '日本語能力試験')
          : question.prompt,
      choices: Array.isArray(question.choices)
        ? question.choices.map((choice) =>
            typeof choice === 'string'
              ? choice.replaceAll('???????', '日本語能力試験')
              : choice,
          )
        : question.choices,
    })),
    answer_key: Object.fromEntries(
      Object.entries(row.answer_key || {}).map(([key, value]) => [
        key,
        typeof value === 'string'
          ? value.replaceAll('???????', '日本語能力試験')
          : value,
      ]),
    ),
  }));
}

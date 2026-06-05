const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

function compactList(items, formatter, limit = 24) {
  return items.slice(0, limit).map(formatter).join('\n');
}

export function buildLessonQuizPrompt({ lesson, vocabulary, grammar, kanji }) {
  const vocabText = compactList(
    vocabulary,
    (item) =>
      `- ${item.word}${item.furigana ? ` (${item.furigana})` : ''}: ${item.meaning}${
        item.details ? `; ${item.details}` : ''
      }`,
  );
  const grammarText = compactList(
    grammar,
    (item) =>
      `- ${item.title}: ${item.structure || ''}. ${item.explanation || ''} ${
        item.example_japanese ? `Example: ${item.example_japanese}` : ''
      }`,
    16,
  );
  const kanjiText = compactList(
    kanji,
    (item) =>
      `- ${item.character}: ${item.meaning}; onyomi ${item.onyomi || '-'}; kunyomi ${
        item.kunyomi || '-'
      }`,
    18,
  );

  return `You are creating a Japanese practice quiz for a learner.
Use ONLY the lesson content below. Do not introduce vocabulary, grammar, or kanji that is not present.
Return Vietnamese-friendly explanations.

Lesson: ${lesson?.title || 'Untitled lesson'}
Description: ${lesson?.description || ''}
JLPT level: ${lesson?.jlpt_level || ''}

Vocabulary:
${vocabText || '- none'}

Grammar:
${grammarText || '- none'}

Kanji:
${kanjiText || '- none'}

Create 30 questions. Mix multiple-choice, fill-in-the-blank, translation, and grammar-choice questions when possible.
Each multiple-choice question must have 4 choices.
Each answer must be concise and exactly match one choice when choices are provided.`;
}

const quizSchema = {
  type: 'OBJECT',
  properties: {
    title: { type: 'STRING' },
    questions: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          type: {
            type: 'STRING',
            enum: ['multiple_choice', 'fill_blank', 'translation', 'grammar_choice'],
          },
          skill: { type: 'STRING', enum: ['vocabulary', 'grammar', 'kanji', 'mixed'] },
          prompt: { type: 'STRING' },
          choices: { type: 'ARRAY', items: { type: 'STRING' } },
          answer: { type: 'STRING' },
          explanation: { type: 'STRING' },
          source: { type: 'STRING' },
        },
        required: ['type', 'skill', 'prompt', 'choices', 'answer', 'explanation', 'source'],
      },
    },
  },
  required: ['title', 'questions'],
};

export async function generateLessonQuiz({ lesson, vocabulary, grammar, kanji }) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  const model = import.meta.env.VITE_GEMINI_MODEL || 'gemini-2.5-flash';

  if (!apiKey) {
    throw new Error('Missing VITE_GEMINI_API_KEY. Add it to .env and restart Vite.');
  }

  const response = await fetch(
    `${GEMINI_API_BASE}/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: buildLessonQuizPrompt({ lesson, vocabulary, grammar, kanji }) }] }],
        generationConfig: {
          temperature: 0.35,
          responseMimeType: 'application/json',
          responseSchema: quizSchema,
        },
      }),
    },
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error?.message || 'Gemini request failed.');
  }

  const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('Gemini did not return quiz JSON.');
  }

  const quiz = JSON.parse(text);
  return {
    title: quiz.title || 'AI Practice Quiz',
    questions: (quiz.questions || []).map((question, index) => ({
      id: `${Date.now()}-${index}`,
      ...question,
      choices: Array.isArray(question.choices) ? question.choices : [],
    })),
  };
}

export async function generateQuestionBank(params) {
  const quiz = await generateLessonQuiz(params);
  return quiz.questions;
}

import { useMemo, useState } from 'react';
import { Bot, CheckCircle2, LoaderCircle, Save, Sparkles } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { generateLessonQuiz } from '../lib/geminiQuiz';

function normalizeAnswer(value) {
  return String(value ?? '').trim().toLowerCase();
}

export default function QuizPanel({ lesson, vocabulary, grammar, kanji }) {
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [showResult, setShowResult] = useState(false);

  const score = useMemo(() => {
    if (!quiz) return 0;
    return quiz.questions.reduce((total, question) => {
      return total + (normalizeAnswer(answers[question.id]) === normalizeAnswer(question.answer) ? 1 : 0);
    }, 0);
  }, [answers, quiz]);

  async function handleGenerate() {
    setGenerating(true);
    setMessage('');
    setShowResult(false);
    setAnswers({});

    try {
      const nextQuiz = await generateLessonQuiz({ lesson, vocabulary, grammar, kanji });
      setQuiz(nextQuiz);
    } catch (err) {
      setMessage(err.message);
    } finally {
      setGenerating(false);
    }
  }

  async function handleSave() {
    if (!quiz) return;

    setSaving(true);
    setMessage('');

    const { error } = await supabase.from('quiz_history').insert({
      lesson_id: lesson.id,
      score,
      total_questions: quiz.questions.length,
    });

    setSaving(false);

    if (error) {
      setMessage(`Could not save quiz result: ${error.message}`);
      return;
    }

    setMessage('Quiz result saved.');
  }

  return (
    <section className="mb-8 rounded bg-white/90 p-6 shadow-zen ring-1 ring-indigo/5">
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-vermilion">
            <Bot className="h-4 w-4" />
            Gemini practice
          </p>
          <h2 className="font-mincho text-3xl">AI Quiz Generator</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-ink/70">
            Generates practice strictly from this lesson&apos;s vocabulary, grammar, and kanji.
          </p>
        </div>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={generating}
          className="inline-flex items-center justify-center gap-2 rounded bg-indigo px-4 py-3 text-sm font-semibold text-washi shadow-soft transition hover:bg-indigo/95 disabled:opacity-70"
        >
          {generating ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Generate quiz
        </button>
      </div>

      {message ? <p className="mb-5 rounded bg-sakura/20 px-4 py-3 text-sm text-indigo">{message}</p> : null}

      {quiz ? (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 rounded bg-washi p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-mincho text-2xl">{quiz.title}</p>
              <p className="mt-1 text-sm text-ink/70">{quiz.questions.length} questions</p>
            </div>
            {showResult ? (
              <p className="rounded bg-sakura/30 px-4 py-2 text-sm font-semibold text-indigo">
                Score: {score}/{quiz.questions.length}
              </p>
            ) : null}
          </div>

          {quiz.questions.map((question, index) => {
            const isCorrect = normalizeAnswer(answers[question.id]) === normalizeAnswer(question.answer);
            return (
              <article key={question.id} className="rounded border border-indigo/10 bg-white p-4">
                <div className="mb-3 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-vermilion">
                      {question.skill} · {question.type.replaceAll('_', ' ')}
                    </p>
                    <h3 className="mt-2 font-semibold text-indigo">
                      {index + 1}. {question.prompt}
                    </h3>
                  </div>
                  {showResult && isCorrect ? <CheckCircle2 className="h-5 w-5 text-vermilion" /> : null}
                </div>

                {question.choices.length > 0 ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {question.choices.map((choice) => (
                      <label key={choice} className="flex cursor-pointer items-center gap-3 rounded bg-washi px-3 py-2 text-sm">
                        <input
                          type="radio"
                          name={question.id}
                          value={choice}
                          checked={answers[question.id] === choice}
                          onChange={(event) =>
                            setAnswers((current) => ({ ...current, [question.id]: event.target.value }))
                          }
                        />
                        {choice}
                      </label>
                    ))}
                  </div>
                ) : (
                  <input
                    className="w-full rounded border border-indigo/10 bg-washi px-3 py-2 text-sm focus:outline-none"
                    value={answers[question.id] || ''}
                    onChange={(event) =>
                      setAnswers((current) => ({ ...current, [question.id]: event.target.value }))
                    }
                    placeholder="Your answer"
                  />
                )}

                {showResult ? (
                  <div className="mt-3 rounded bg-mist p-3 text-sm leading-6 text-ink/75">
                    <p>
                      <span className="font-semibold text-indigo">Answer:</span> {question.answer}
                    </p>
                    <p>{question.explanation}</p>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-vermilion">
                      Source: {question.source}
                    </p>
                  </div>
                ) : null}
              </article>
            );
          })}

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => setShowResult(true)}
              className="rounded bg-vermilion px-4 py-3 text-sm font-semibold text-white shadow-soft"
            >
              Check answers
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!showResult || saving}
              className="inline-flex items-center justify-center gap-2 rounded border border-indigo/10 bg-white px-4 py-3 text-sm font-semibold text-indigo shadow-soft disabled:opacity-60"
            >
              {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save result
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

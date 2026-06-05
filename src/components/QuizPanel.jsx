import { useEffect, useMemo, useState } from 'react';
import { Bot, CheckCircle2, DatabaseZap, LoaderCircle, Save, Shuffle, Sparkles } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { generateQuestionBank } from '../lib/geminiQuiz';

const QUIZ_SIZE = 8;

function normalizeAnswer(value) {
  return String(value ?? '').trim().toLowerCase();
}

function shuffle(items) {
  return [...items].sort(() => Math.random() - 0.5);
}

function normalizeQuestion(question, index) {
  return {
    id: question.id || `${Date.now()}-${index}`,
    type: question.type || 'multiple_choice',
    skill: question.skill || 'mixed',
    prompt: question.prompt || '',
    choices: Array.isArray(question.choices) ? question.choices : [],
    answer: question.answer || '',
    explanation: question.explanation || '',
    source: question.source || '',
  };
}

export default function QuizPanel({ lesson, vocabulary, grammar, kanji }) {
  const { user, isAdmin } = useAuth();
  const [questionCount, setQuestionCount] = useState(0);
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [loadingBank, setLoadingBank] = useState(true);
  const [generatingBank, setGeneratingBank] = useState(false);
  const [creatingQuiz, setCreatingQuiz] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [showResult, setShowResult] = useState(false);

  const score = useMemo(() => {
    if (!quiz) return 0;
    return quiz.questions.reduce((total, question) => {
      return total + (normalizeAnswer(answers[question.id]) === normalizeAnswer(question.answer) ? 1 : 0);
    }, 0);
  }, [answers, quiz]);

  async function loadQuestionCount() {
    setLoadingBank(true);
    const { count, error } = await supabase
      .from('question_bank')
      .select('id', { count: 'exact', head: true })
      .eq('lesson_id', lesson.id);

    if (error) {
      setMessage(`Could not load question bank: ${error.message}`);
      setLoadingBank(false);
      return;
    }

    setQuestionCount(count ?? 0);
    setLoadingBank(false);
  }

  useEffect(() => {
    if (lesson?.id) loadQuestionCount();
  }, [lesson?.id]);

  async function handleGenerateBank() {
    setGeneratingBank(true);
    setMessage('');

    try {
      const questions = await generateQuestionBank({ lesson, vocabulary, grammar, kanji });
      const rows = questions.map((question) => ({
        lesson_id: lesson.id,
        type: question.type,
        skill: question.skill,
        prompt: question.prompt,
        choices: question.choices,
        answer: question.answer,
        explanation: question.explanation,
        source: question.source,
        difficulty: 'normal',
        created_by_ai: true,
      }));

      const { error } = await supabase.from('question_bank').insert(rows);
      if (error) throw error;

      setMessage(`Added ${rows.length} questions to this lesson bank.`);
      await loadQuestionCount();
    } catch (err) {
      setMessage(err.message);
    } finally {
      setGeneratingBank(false);
    }
  }

  async function handleCreateQuiz() {
    setCreatingQuiz(true);
    setMessage('');
    setShowResult(false);
    setAnswers({});

    const { data, error } = await supabase
      .from('question_bank')
      .select('*')
      .eq('lesson_id', lesson.id);

    setCreatingQuiz(false);

    if (error) {
      setMessage(`Could not create quiz: ${error.message}`);
      return;
    }

    const bank = data ?? [];
    if (bank.length === 0) {
      setMessage('No questions are available yet. Ask an admin to generate the question bank first.');
      return;
    }

    const selected = shuffle(bank).slice(0, Math.min(QUIZ_SIZE, bank.length));
    setQuiz({
      title: `${lesson.title || 'Lesson'} Practice`,
      questions: selected.map(normalizeQuestion),
    });
  }

  async function handleSave() {
    if (!quiz) return;

    setSaving(true);
    setMessage('');

    const { error } = await supabase.from('quiz_attempts').insert({
      user_id: user.id,
      lesson_id: lesson.id,
      score,
      total_questions: quiz.questions.length,
      questions: quiz.questions,
      answers,
    });

    setSaving(false);

    if (error) {
      setMessage(`Could not save quiz result: ${error.message}`);
      return;
    }

    setMessage('Quiz result saved.');
  }

  return (
    <section className="zen-glass mb-8 p-6">
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-vermilion">
            <Bot className="h-4 w-4" />
            Practice quiz
          </p>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-ink/70">
            Users get a fresh random quiz from saved lesson questions. Gemini is only used by admins to expand the bank.
          </p>
          <p className="mt-2 text-sm font-semibold text-indigo">
            {loadingBank ? 'Loading bank...' : `${questionCount} saved questions`}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          {isAdmin ? (
            <button
              type="button"
              onClick={handleGenerateBank}
              disabled={generatingBank}
              className="zen-hover inline-flex items-center justify-center gap-2 rounded border border-indigo/10 bg-white px-4 py-3 text-sm font-semibold text-indigo shadow-soft transition hover:border-sakura disabled:opacity-70"
            >
              {generatingBank ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <DatabaseZap className="h-4 w-4" />}
              Generate bank with AI
            </button>
          ) : null}
          <button
            type="button"
            onClick={handleCreateQuiz}
            disabled={creatingQuiz || loadingBank}
            className="zen-shimmer inline-flex items-center justify-center gap-2 rounded bg-indigo px-4 py-3 text-sm font-semibold text-washi shadow-soft transition hover:bg-indigo/95 disabled:opacity-70"
          >
            {creatingQuiz ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Shuffle className="h-4 w-4" />}
            Create random quiz
          </button>
        </div>
      </div>

      {message ? <p className="mb-5 rounded bg-sakura/20 px-4 py-3 text-sm text-indigo">{message}</p> : null}

      {quiz ? (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 rounded bg-washi p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-mincho text-2xl">{quiz.title}</p>
              <p className="mt-1 text-sm text-ink/70">{quiz.questions.length} random questions</p>
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
              <article key={question.id} className="zen-hover rounded border border-indigo/10 bg-white/85 p-4 shadow-soft">
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
              className="zen-shimmer rounded bg-vermilion px-4 py-3 text-sm font-semibold text-white shadow-soft"
            >
              Check answers
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!showResult || saving}
              className="zen-hover inline-flex items-center justify-center gap-2 rounded border border-indigo/10 bg-white px-4 py-3 text-sm font-semibold text-indigo shadow-soft disabled:opacity-60"
            >
              {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save attempt
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

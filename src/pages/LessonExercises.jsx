import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  BookOpenText,
  ChevronDown,
  CheckCircle2,
  LoaderCircle,
  Settings,
  Sparkles,
  Target,
  XCircle,
} from 'lucide-react';
import ExerciseManager from '../components/ExerciseManager';
import ExerciseSection from '../components/ExerciseSection';
import QuizPanel from '../components/QuizPanel';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';

function normalizeAnswer(value) {
  return String(value ?? '').trim().toLowerCase();
}

function pick(item, keys, fallback = '') {
  for (const key of keys) {
    if (item?.[key]) return item[key];
  }

  return fallback;
}

function titleForLesson(lesson) {
  return pick(
    lesson,
    ['title', 'name', 'lesson_title', 'japanese_title'],
    'Untitled lesson',
  );
}

function detailForLesson(lesson) {
  return pick(
    lesson,
    ['description', 'summary', 'content', 'notes'],
    'Practice the lesson material below.',
  );
}

function formatDate(value) {
  if (!value) return 'Unknown date';

  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function getQuizMistakes(attempt) {
  return (attempt?.questions || []).filter((question) => {
    return normalizeAnswer(attempt.answers?.[question.id]) !== normalizeAnswer(question.answer);
  });
}

function getExerciseMistakes(attempt, exercise) {
  const questions = Array.isArray(exercise?.questions) ? exercise.questions : [];
  const answerKey =
    exercise?.answer_key && typeof exercise.answer_key === 'object'
      ? exercise.answer_key
      : {};

  return questions.filter((question, index) => {
    const key = question.id || String(index);
    return normalizeAnswer(attempt?.answers?.[key]) !== normalizeAnswer(answerKey[key]);
  });
}

function ProgressPanel({ quizAttempts, exerciseAttempts, exercises }) {
  const latestQuiz = quizAttempts[0];
  const latestExercise = exerciseAttempts[0];
  const latestExerciseSource = latestExercise
    ? exercises.find((exercise) => exercise.id === latestExercise.exercise_id)
    : null;
  const quizMistakes = getQuizMistakes(latestQuiz);
  const exerciseMistakes = getExerciseMistakes(latestExercise, latestExerciseSource);

  return (
    <section className="zen-glass mb-8 p-6">
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-vermilion">
            <Target className="h-4 w-4" />
            Progress
          </p>
          <h2 className="font-mincho text-3xl">Study history</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-ink/70">
            Track recent quiz and exercise attempts, then review missed answers.
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <article className="rounded bg-washi p-4">
          <p className="text-sm font-semibold text-ink/65">Latest quiz score</p>
          <p className="mt-2 font-mincho text-3xl text-indigo">
            {latestQuiz ? `${latestQuiz.score}/${latestQuiz.total_questions}` : '-'}
          </p>
          <p className="mt-2 text-sm text-ink/65">
            {latestQuiz ? formatDate(latestQuiz.created_at) : 'No quiz attempts yet.'}
          </p>
        </article>

        <article className="rounded bg-washi p-4">
          <p className="text-sm font-semibold text-ink/65">Latest exercise score</p>
          <p className="mt-2 font-mincho text-3xl text-indigo">
            {latestExercise
              ? `${latestExercise.score}/${latestExercise.total_questions}`
              : '-'}
          </p>
          <p className="mt-2 text-sm text-ink/65">
            {latestExercise
              ? `${latestExerciseSource?.title || 'Exercise'} - ${formatDate(
                  latestExercise.created_at,
                )}`
              : 'No exercise attempts yet.'}
          </p>
        </article>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <div>
          <h3 className="mb-3 font-mincho text-2xl">Recent quizzes</h3>
          <div className="space-y-2">
            {quizAttempts.slice(0, 5).map((attempt) => (
              <div
                key={attempt.id}
                className="flex items-center justify-between gap-3 rounded border border-indigo/10 bg-white/75 px-4 py-3 text-sm"
              >
                <span className="text-ink/70">{formatDate(attempt.created_at)}</span>
                <span className="font-semibold text-indigo">
                  {attempt.score}/{attempt.total_questions}
                </span>
              </div>
            ))}
            {quizAttempts.length === 0 ? (
              <p className="rounded bg-white/70 p-4 text-sm text-ink/70">
                No quiz history yet.
              </p>
            ) : null}
          </div>
        </div>

        <div>
          <h3 className="mb-3 font-mincho text-2xl">Recent exercises</h3>
          <div className="space-y-2">
            {exerciseAttempts.slice(0, 5).map((attempt) => {
              const exercise = exercises.find((item) => item.id === attempt.exercise_id);
              return (
                <div
                  key={attempt.id}
                  className="flex items-center justify-between gap-3 rounded border border-indigo/10 bg-white/75 px-4 py-3 text-sm"
                >
                  <span className="truncate text-ink/70">
                    {exercise?.title || 'Exercise'} - {formatDate(attempt.created_at)}
                  </span>
                  <span className="font-semibold text-indigo">
                    {attempt.score}/{attempt.total_questions}
                  </span>
                </div>
              );
            })}
            {exerciseAttempts.length === 0 ? (
              <p className="rounded bg-white/70 p-4 text-sm text-ink/70">
                No exercise history yet.
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {(latestQuiz || latestExercise) ? (
        <div className="mt-6 rounded border border-sakura/40 bg-sakura/10 p-4">
          <h3 className="mb-3 flex items-center gap-2 font-mincho text-2xl">
            <XCircle className="h-5 w-5 text-vermilion" />
            Review mistakes
          </h3>

          {latestQuiz ? (
            <div className="mb-5">
              <p className="mb-2 text-sm font-semibold text-indigo">
                Latest quiz mistakes
              </p>
              {quizMistakes.length > 0 ? (
                <div className="space-y-3">
                  {quizMistakes.map((question, index) => (
                    <div key={question.id} className="rounded bg-white/80 p-3 text-sm">
                      <p className="font-semibold text-indigo">
                        {index + 1}. {question.prompt}
                      </p>
                      <p className="mt-2 text-ink/70">
                        Your answer: {latestQuiz.answers?.[question.id] || '-'}
                      </p>
                      <p className="mt-1 text-vermilion">
                        Correct: {question.answer}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="flex items-center gap-2 text-sm text-ink/70">
                  <CheckCircle2 className="h-4 w-4 text-vermilion" />
                  No mistakes in the latest quiz.
                </p>
              )}
            </div>
          ) : null}

          {latestExercise ? (
            <div>
              <p className="mb-2 text-sm font-semibold text-indigo">
                Latest exercise mistakes
              </p>
              {exerciseMistakes.length > 0 ? (
                <div className="space-y-3">
                  {exerciseMistakes.map((question, index) => {
                    const key = question.id || String(index);
                    const answerKey =
                      latestExerciseSource?.answer_key &&
                      typeof latestExerciseSource.answer_key === 'object'
                        ? latestExerciseSource.answer_key
                        : {};

                    return (
                      <div key={key} className="rounded bg-white/80 p-3 text-sm">
                        <p className="font-semibold text-indigo">
                          {index + 1}. {question.prompt}
                        </p>
                        <p className="mt-2 text-ink/70">
                          Your answer: {latestExercise.answers?.[key] || '-'}
                        </p>
                        <p className="mt-1 text-vermilion">
                          Correct: {answerKey[key]}
                        </p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="flex items-center gap-2 text-sm text-ink/70">
                  <CheckCircle2 className="h-4 w-4 text-vermilion" />
                  No mistakes in the latest exercise.
                </p>
              )}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

export default function LessonExercises() {
  const { lessonId } = useParams();
  const { isAdmin, user } = useAuth();
  const [lesson, setLesson] = useState(null);
  const [vocabulary, setVocabulary] = useState([]);
  const [grammar, setGrammar] = useState([]);
  const [kanji, setKanji] = useState([]);
  const [exercises, setExercises] = useState([]);
  const [quizAttempts, setQuizAttempts] = useState([]);
  const [exerciseAttempts, setExerciseAttempts] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [attemptRefreshKey, setAttemptRefreshKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAdminTools, setShowAdminTools] = useState(true);

  useEffect(() => {
    if (!user?.id) return;

    let mounted = true;

    async function loadExercises() {
      setLoading(true);
      setError('');

      const [
        lessonResult,
        vocabularyResult,
        grammarResult,
        kanjiResult,
        exercisesResult,
        quizAttemptsResult,
        exerciseAttemptsResult,
      ] = await Promise.all([
        supabase.from('lessons').select('*').eq('id', lessonId).single(),
        supabase.from('vocabulary').select('*').eq('lesson_id', lessonId),
        supabase.from('grammar').select('*').eq('lesson_id', lessonId),
        supabase.from('kanji').select('*').eq('lesson_id', lessonId),
        supabase
          .from('lesson_exercises')
          .select('*')
          .eq('lesson_id', lessonId)
          .order('created_at', { ascending: false }),
        supabase
          .from('quiz_attempts')
          .select('*')
          .eq('lesson_id', lessonId)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('exercise_attempts')
          .select('*')
          .eq('lesson_id', lessonId)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
      ]);

      if (!mounted) return;

      const firstError =
        lessonResult.error ||
        vocabularyResult.error ||
        grammarResult.error ||
        kanjiResult.error ||
        exercisesResult.error ||
        quizAttemptsResult.error ||
        exerciseAttemptsResult.error;

      if (firstError) {
        setError(firstError.message);
        setLoading(false);
        return;
      }

      setLesson(lessonResult.data);
      setVocabulary(vocabularyResult.data ?? []);
      setGrammar(grammarResult.data ?? []);
      setKanji(kanjiResult.data ?? []);
      setExercises(exercisesResult.data ?? []);
      setQuizAttempts(quizAttemptsResult.data ?? []);
      setExerciseAttempts(exerciseAttemptsResult.data ?? []);
      setLoading(false);
    }

    loadExercises();

    return () => {
      mounted = false;
    };
  }, [lessonId, refreshKey, attemptRefreshKey, user?.id]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6 text-indigo">
        <div className="zen-glass flex items-center gap-3 px-5 py-4">
          <LoaderCircle className="h-5 w-5 animate-spin text-vermilion" />
          <span className="text-sm font-medium">Opening exercises...</span>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-5 py-6 text-indigo sm:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-wrap gap-3">
          <Link
            to={`/lessons/${lessonId}`}
            className="inline-flex items-center gap-2 text-sm font-semibold text-vermilion transition hover:text-indigo"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to theory
          </Link>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 text-sm font-semibold text-ink/65 transition hover:text-indigo"
          >
            Back to lessons
          </Link>
        </div>

        {error ? (
          <div className="flex items-start gap-3 rounded border border-vermilion/20 bg-vermilion/10 p-5 text-sm leading-6">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-vermilion" />
            <p>Could not load exercises: {error}</p>
          </div>
        ) : (
          <>
            <section className="zen-glass mb-8 p-7">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-vermilion">
                    <BookOpenText className="h-4 w-4" />
                    Exercises
                  </p>
                  <h1 className="font-mincho text-4xl">
                    {titleForLesson(lesson)}
                  </h1>
                  <p className="mt-4 max-w-3xl leading-7 text-ink/75">
                    {detailForLesson(lesson)}
                  </p>
                </div>
                <div className="zen-hover flex h-14 w-14 items-center justify-center rounded bg-sakura/30">
                  <Sparkles className="h-7 w-7 text-vermilion" />
                </div>
              </div>
            </section>

            {isAdmin ? (
              <section className="mb-8">
                <button
                  type="button"
                  onClick={() => setShowAdminTools((current) => !current)}
                  className="zen-hover inline-flex items-center gap-2 rounded border border-indigo/10 bg-white/85 px-4 py-3 text-sm font-semibold text-indigo shadow-soft transition hover:border-sakura"
                >
                  <Settings className="h-4 w-4 text-vermilion" />
                  Exercise manager
                  <ChevronDown
                    className={`h-4 w-4 transition ${showAdminTools ? 'rotate-180' : ''}`}
                  />
                </button>
                <div
                  className={`grid transition-all duration-300 ${
                    showAdminTools
                      ? 'mt-4 grid-rows-[1fr] opacity-100'
                      : 'grid-rows-[0fr] opacity-0'
                  }`}
                >
                  <div className="overflow-hidden">
                    <ExerciseManager
                      lessonId={lessonId}
                      exercises={exercises}
                      onChange={() => setRefreshKey((current) => current + 1)}
                    />
                  </div>
                </div>
              </section>
            ) : null}

            <ProgressPanel
              quizAttempts={quizAttempts}
              exerciseAttempts={exerciseAttempts}
              exercises={exercises}
            />

            <QuizPanel
              lesson={lesson}
              vocabulary={vocabulary}
              grammar={grammar}
              kanji={kanji}
              onAttemptSaved={() => setAttemptRefreshKey((current) => current + 1)}
            />

            <ExerciseSection
              exercises={exercises}
              onAttemptSaved={() => setAttemptRefreshKey((current) => current + 1)}
            />
          </>
        )}
      </div>
    </main>
  );
}

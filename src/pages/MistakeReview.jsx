import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { AlertCircle, ArrowRight, BookOpenText, CheckCircle2, LoaderCircle, XCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';

function normalizeAnswer(value) {
  return String(value ?? '').trim().toLowerCase();
}

function parseQuestions(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function mistakeKey(source, id, index) {
  return `${source}:${id}:${index}`;
}

export default function MistakeReview() {
  const { user } = useAuth();
  const [quizAttempts, setQuizAttempts] = useState([]);
  const [exerciseAttempts, setExerciseAttempts] = useState([]);
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user?.id) return;

    let mounted = true;

    async function loadMistakes() {
      setLoading(true);
      setError('');

      const [quizResult, exerciseAttemptResult, exercisesResult] = await Promise.all([
        supabase
          .from('quiz_attempts')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(20),
        supabase
          .from('exercise_attempts')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(20),
        supabase.from('lesson_exercises').select('*'),
      ]);

      if (!mounted) return;

      const firstError = quizResult.error || exerciseAttemptResult.error || exercisesResult.error;
      if (firstError) {
        setError(firstError.message);
        setLoading(false);
        return;
      }

      setQuizAttempts(quizResult.data ?? []);
      setExerciseAttempts(exerciseAttemptResult.data ?? []);
      setExercises(exercisesResult.data ?? []);
      setLoading(false);
    }

    loadMistakes();

    return () => {
      mounted = false;
    };
  }, [user?.id]);

  const mistakes = useMemo(() => {
    const quizMistakes = quizAttempts.flatMap((attempt) => {
      const questions = parseQuestions(attempt.questions);
      return questions
        .filter((question) => normalizeAnswer(attempt.answers?.[question.id]) !== normalizeAnswer(question.answer))
        .map((question, index) => ({
          key: mistakeKey('quiz', attempt.id, index),
          source: 'Quiz',
          prompt: question.prompt,
          answer: question.answer,
          userAnswer: attempt.answers?.[question.id] || '-',
          lessonId: attempt.lesson_id,
          createdAt: attempt.created_at,
        }));
    });

    const exerciseMistakes = exerciseAttempts.flatMap((attempt) => {
      const exercise = exercises.find((item) => item.id === attempt.exercise_id);
      const questions = parseQuestions(exercise?.questions);
      const answerKey = exercise?.answer_key && typeof exercise.answer_key === 'object' ? exercise.answer_key : {};

      return questions
        .filter((question, index) => {
          const key = question.id || String(index);
          return normalizeAnswer(attempt.answers?.[key]) !== normalizeAnswer(answerKey[key]);
        })
        .map((question, index) => {
          const key = question.id || String(index);
          return {
            key: mistakeKey('exercise', attempt.id, index),
            source: exercise?.title || 'Exercise',
            prompt: question.prompt,
            answer: answerKey[key],
            userAnswer: attempt.answers?.[key] || '-',
            lessonId: attempt.lesson_id,
            createdAt: attempt.created_at,
          };
        });
    });

    return [...quizMistakes, ...exerciseMistakes].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
    );
  }, [exerciseAttempts, exercises, quizAttempts]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6 text-indigo">
        <div className="zen-glass flex items-center gap-3 px-5 py-4">
          <LoaderCircle className="h-5 w-5 animate-spin text-vermilion" />
          <span className="text-sm font-medium">Đang tải câu sai...</span>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-5 py-6 text-indigo sm:px-8">
      <div className="mx-auto max-w-5xl">
        <section className="zen-glass mb-8 p-7">
          <p className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-vermilion">
            <XCircle className="h-4 w-4" />
            Ôn câu sai
          </p>
          <h1 className="font-mincho text-4xl">Ôn lại câu sai</h1>
          <p className="mt-4 max-w-3xl leading-7 text-ink/75">
            Gom các câu sai gần đây từ quiz và bài tập đã lưu để bạn ôn lại nhanh.
          </p>
        </section>

        {error ? (
          <div className="mb-5 flex items-start gap-3 rounded border border-vermilion/20 bg-vermilion/10 p-5 text-sm">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-vermilion" />
            <p>{error}</p>
          </div>
        ) : null}

        {mistakes.length === 0 ? (
          <section className="zen-glass p-10 text-center">
            <div className="pointer-events-none font-mincho text-8xl leading-none text-indigo/10">完璧</div>
            <h2 className="mt-4 font-mincho text-3xl text-indigo">Bạn thật xuất sắc!</h2>
            <p className="mx-auto mt-3 max-w-sm text-sm leading-7 text-ink/65">
              Không có lỗi sai nào trong thời gian gần đây. Hãy tiếp tục phát huy nhé!
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                to="/dashboard"
                className="zen-shimmer inline-flex items-center gap-2 rounded bg-indigo px-5 py-3 text-sm font-semibold text-washi shadow-soft"
              >
                <BookOpenText className="h-4 w-4" />
                Vào trang học
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </section>
        ) : (
          <div className="space-y-4">
            {mistakes.map((mistake, index) => (
              <motion.article 
                key={mistake.key} 
                className="zen-glass zen-hover p-5"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05, duration: 0.3 }}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-vermilion">
                      {mistake.source}
                    </p>
                    <h2 className="mt-2 font-semibold leading-7 text-indigo">
                      {index + 1}. {mistake.prompt}
                    </h2>
                  </div>
                  <Link
                    to={`/lessons/${mistake.lessonId}/exercises`}
                    className="rounded bg-indigo px-3 py-2 text-sm font-semibold text-washi transition hover:bg-indigo/90"
                  >
                    Luyện lại
                  </Link>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="flex items-start gap-2 rounded bg-vermilion/10 p-3 text-sm">
                    <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-vermilion" />
                    <p>
                      <span className="font-semibold text-indigo">Bạn chọn: </span>
                      {mistake.userAnswer}
                    </p>
                  </div>
                  <div className="flex items-start gap-2 rounded bg-emerald-50 p-3 text-sm">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    <p>
                      <span className="font-semibold text-indigo">Đáp án: </span>
                      {mistake.answer}
                    </p>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

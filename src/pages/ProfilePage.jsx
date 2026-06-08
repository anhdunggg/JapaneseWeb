import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, BarChart3, BookOpenText, Flame, LoaderCircle, Target } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';

function averageScore(attempts) {
  const scored = attempts.filter((item) => item.total_questions);
  if (!scored.length) return 0;
  const total = scored.reduce((sum, item) => sum + item.score / item.total_questions, 0);
  return Math.round((total / scored.length) * 100);
}

export default function ProfilePage() {
  const { user } = useAuth();
  const [progress, setProgress] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [quizAttempts, setQuizAttempts] = useState([]);
  const [exerciseAttempts, setExerciseAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user?.id) return;

    let mounted = true;
    async function loadProfile() {
      setLoading(true);
      const [progressResult, reviewResult, quizResult, exerciseResult] = await Promise.all([
        supabase.from('user_lesson_progress').select('*').eq('user_id', user.id),
        supabase.from('user_item_reviews').select('*').eq('user_id', user.id),
        supabase.from('quiz_attempts').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('exercise_attempts').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      ]);

      if (!mounted) return;
      const firstError = progressResult.error || reviewResult.error || quizResult.error || exerciseResult.error;
      if (firstError) {
        setError(firstError.message);
        setLoading(false);
        return;
      }

      setProgress(progressResult.data ?? []);
      setReviews(reviewResult.data ?? []);
      setQuizAttempts(quizResult.data ?? []);
      setExerciseAttempts(exerciseResult.data ?? []);
      setLoading(false);
    }

    loadProfile();
    return () => {
      mounted = false;
    };
  }, [user?.id]);

  const stats = useMemo(() => {
    const weak = reviews.filter((item) => item.status === 'weak').length;
    const known = reviews.filter((item) => item.status === 'known').length;
    const completed = progress.filter((item) => item.status === 'completed').length;
    const review = progress.filter((item) => item.status === 'review').length;
    const avg = averageScore([...quizAttempts, ...exerciseAttempts]);
    return { weak, known, completed, review, avg };
  }, [exerciseAttempts, progress, quizAttempts, reviews]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6 text-indigo">
        <div className="zen-glass flex items-center gap-3 px-5 py-4">
          <LoaderCircle className="h-5 w-5 animate-spin text-vermilion" />
          <span className="text-sm font-medium">Đang tải hồ sơ học tập...</span>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-5 py-6 text-indigo sm:px-8">
      <div className="mx-auto max-w-6xl">
        <Link to="/dashboard" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-vermilion">
          <ArrowLeft className="h-4 w-4" />
          Về dashboard
        </Link>

        <section className="zen-glass mb-8 p-7">
          <p className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-vermilion">
            <BarChart3 className="h-4 w-4" />
            Hồ sơ
          </p>
          <h1 className="font-mincho text-4xl">Tiến độ học tập</h1>
          <p className="mt-3 text-sm text-ink/65">{user?.email}</p>
          {error ? <p className="mt-4 rounded bg-vermilion/10 p-3 text-sm text-vermilion">{error}</p> : null}
        </section>

        <section className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {[
            { icon: BookOpenText, label: 'Hoàn thành', value: stats.completed },
            { icon: Target, label: 'Cần review', value: stats.review },
            { icon: Flame, label: 'Từ yếu', value: stats.weak },
            { icon: BookOpenText, label: 'Đã nhớ', value: stats.known },
            { icon: BarChart3, label: 'Điểm TB', value: `${stats.avg}%` },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.label} className="zen-glass zen-hover p-5">
                <Icon className="h-5 w-5 text-vermilion" />
                <p className="mt-4 font-mincho text-4xl">{item.value}</p>
                <p className="mt-1 text-sm font-semibold text-ink/65">{item.label}</p>
              </article>
            );
          })}
        </section>

        <section className="grid gap-5 lg:grid-cols-2">
          <article className="zen-glass p-5">
            <h2 className="font-mincho text-2xl">Quiz gần đây</h2>
            <div className="mt-4 space-y-2">
              {quizAttempts.slice(0, 8).map((attempt) => (
                <div key={attempt.id} className="flex items-center justify-between rounded bg-washi px-4 py-3 text-sm">
                  <span>{new Date(attempt.created_at).toLocaleDateString()}</span>
                  <span className="font-semibold text-indigo">{attempt.score}/{attempt.total_questions}</span>
                </div>
              ))}
              {quizAttempts.length === 0 ? <p className="text-sm text-ink/65">Chưa có lịch sử quiz.</p> : null}
            </div>
          </article>

          <article className="zen-glass p-5">
            <h2 className="font-mincho text-2xl">Bài tập gần đây</h2>
            <div className="mt-4 space-y-2">
              {exerciseAttempts.slice(0, 8).map((attempt) => (
                <div key={attempt.id} className="flex items-center justify-between rounded bg-washi px-4 py-3 text-sm">
                  <span>{new Date(attempt.created_at).toLocaleDateString()}</span>
                  <span className="font-semibold text-indigo">{attempt.score}/{attempt.total_questions}</span>
                </div>
              ))}
              {exerciseAttempts.length === 0 ? <p className="text-sm text-ink/65">Chưa có lịch sử bài tập.</p> : null}
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}

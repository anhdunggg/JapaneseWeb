import { useEffect, useMemo, useState } from 'react';
import { BarChart3, BookOpenText, CalendarDays, Flame, LoaderCircle, Mail, Target, Trophy } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';

function averageScore(attempts) {
  const scored = attempts.filter((item) => item.total_questions);
  if (!scored.length) return 0;
  const total = scored.reduce((sum, item) => sum + item.score / item.total_questions, 0);
  return Math.round((total / scored.length) * 100);
}

function formatDate(value) {
  if (!value) return 'Chưa có dữ liệu';
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium' }).format(new Date(value));
}

function initialsFromEmail(email = '') {
  return email.slice(0, 2).toUpperCase() || 'JP';
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
    const lastActivity =
      [...progress]
        .map((item) => item.last_activity_at)
        .filter(Boolean)
        .sort((a, b) => new Date(b) - new Date(a))[0] || '';
    return { weak, known, completed, review, avg, lastActivity };
  }, [exerciseAttempts, progress, quizAttempts, reviews]);

  const completionPercent = progress.length ? Math.round((stats.completed / progress.length) * 100) : 0;
  const activities = [
    ...quizAttempts.slice(0, 5).map((attempt) => ({
      id: `quiz:${attempt.id}`,
      type: 'Quiz',
      date: attempt.created_at,
      score: `${attempt.score}/${attempt.total_questions}`,
    })),
    ...exerciseAttempts.slice(0, 5).map((attempt) => ({
      id: `exercise:${attempt.id}`,
      type: 'Bài tập',
      date: attempt.created_at,
      score: `${attempt.score}/${attempt.total_questions}`,
    })),
  ]
    .sort((first, second) => new Date(second.date) - new Date(first.date))
    .slice(0, 8);

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
        <section className="quest-hero zen-glass mb-8 overflow-hidden p-7 text-washi">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-5">
              <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-washi font-mincho text-4xl text-indigo shadow-soft ring-4 ring-white/20">
                {initialsFromEmail(user?.email)}
              </div>
              <div>
                <p className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-sakura">
                  <Trophy className="h-4 w-4" />
                  Hồ sơ học tập
                </p>
                <h1 className="font-mincho text-4xl leading-tight">Người học tiếng Nhật</h1>
                <p className="mt-3 flex items-center gap-2 text-sm text-washi/80">
                  <Mail className="h-4 w-4" />
                  {user?.email}
                </p>
              </div>
            </div>

            <div className="rounded border border-white/15 bg-white/10 p-5 text-center backdrop-blur">
              <div
                className="mx-auto flex h-28 w-28 items-center justify-center rounded-full p-2"
                style={{
                  background: `conic-gradient(#FFB7C5 ${completionPercent * 3.6}deg, rgba(255,255,255,0.18) 0deg)`,
                }}
              >
                <div className="flex h-full w-full items-center justify-center rounded-full bg-indigo/80 font-mincho text-3xl text-washi">
                  {completionPercent}%
                </div>
              </div>
              <p className="mt-3 text-sm font-semibold text-washi/80">Tiến độ lesson</p>
            </div>
          </div>
          {error ? <p className="mt-5 rounded bg-vermilion/20 p-3 text-sm text-washi">{error}</p> : null}
        </section>

        <section className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {[
            { icon: BookOpenText, label: 'Hoàn thành', value: stats.completed },
            { icon: Target, label: 'Cần ôn', value: stats.review },
            { icon: Flame, label: 'Từ yếu', value: stats.weak },
            { icon: Trophy, label: 'Đã nhớ', value: stats.known },
            { icon: BarChart3, label: 'Điểm trung bình', value: `${stats.avg}%` },
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

        <section className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <article className="zen-glass p-6">
            <p className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-vermilion">
              <CalendarDays className="h-4 w-4" />
              Tổng quan
            </p>
            <h2 className="font-mincho text-3xl">Nhịp học hiện tại</h2>
            <div className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between rounded bg-washi px-4 py-3">
                <span className="text-ink/65">Bài đã có tiến độ</span>
                <span className="font-semibold text-indigo">{progress.length}</span>
              </div>
              <div className="flex justify-between rounded bg-washi px-4 py-3">
                <span className="text-ink/65">Lần học gần nhất</span>
                <span className="font-semibold text-indigo">{formatDate(stats.lastActivity)}</span>
              </div>
              <div className="flex justify-between rounded bg-washi px-4 py-3">
                <span className="text-ink/65">Tổng lượt luyện</span>
                <span className="font-semibold text-indigo">{quizAttempts.length + exerciseAttempts.length}</span>
              </div>
            </div>
          </article>

          <article className="zen-glass p-6">
            <p className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-vermilion">
              <BarChart3 className="h-4 w-4" />
              Hoạt động
            </p>
            <h2 className="font-mincho text-3xl">Gần đây</h2>
            <div className="mt-5 space-y-2">
              {activities.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between gap-4 rounded bg-washi px-4 py-3 text-sm">
                  <div>
                    <p className="font-semibold text-indigo">{activity.type}</p>
                    <p className="mt-1 text-xs text-ink/60">{formatDate(activity.date)}</p>
                  </div>
                  <span className="rounded bg-sakura/25 px-3 py-1 font-semibold text-indigo">{activity.score}</span>
                </div>
              ))}
              {activities.length === 0 ? (
                <p className="rounded bg-washi p-4 text-sm text-ink/65">Chưa có hoạt động luyện tập.</p>
              ) : null}
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}

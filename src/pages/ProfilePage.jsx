import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { BarChart3, BookOpenText, CalendarDays, Flame, LoaderCircle, Mail, Target, Trophy, Zap } from 'lucide-react';
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

/** Tính chuỗi ngày học liên tiếp từ danh sách tiến độ */
function calcStreak(progressList) {
  const days = new Set(
    progressList
      .map((item) => item.last_activity_at?.slice(0, 10))
      .filter(Boolean),
  );

  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    if (days.has(key)) {
      streak++;
    } else if (i > 0) {
      break;
    }
  }
  return streak;
}

/** Tạo dữ liệu cho biểu đồ hoạt động 8 tuần gần nhất */
function buildWeeklyActivity(quizAttempts, exerciseAttempts) {
  const countByDay = {};
  [...quizAttempts, ...exerciseAttempts].forEach((attempt) => {
    const day = attempt.created_at?.slice(0, 10);
    if (day) countByDay[day] = (countByDay[day] || 0) + 1;
  });

  const weeks = [];
  const today = new Date();
  const startDay = new Date(today);
  startDay.setDate(today.getDate() - 55);

  const monthNames = ['Th1','Th2','Th3','Th4','Th5','Th6','Th7','Th8','Th9','Th10','Th11','Th12'];

  for (let w = 0; w < 8; w++) {
    const week = [];
    let monthLabel = '';
    for (let d = 0; d < 7; d++) {
      const date = new Date(startDay);
      date.setDate(startDay.getDate() + w * 7 + d);
      const key = date.toISOString().slice(0, 10);
      // gắn nhãn tháng ở ngày đầu tuần nếu là ngày đầu tháng mới (hoặc tuần đầu tiên)
      if (d === 0) {
        monthLabel = monthNames[date.getMonth()];
      }
      week.push({ date: key, count: countByDay[key] || 0 });
    }
    weeks.push({ days: week, monthLabel });
  }
  return weeks;
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
    const streak = calcStreak(progress);
    return { weak, known, completed, review, avg, lastActivity, streak };
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

  const weeklyActivity = useMemo(
    () => buildWeeklyActivity(quizAttempts, exerciseAttempts),
    [quizAttempts, exerciseAttempts],
  );

  const maxCount = useMemo(
    () => Math.max(1, ...weeklyActivity.flatMap((w) => w.days.map((d) => d.count))),
    [weeklyActivity],
  );

  const dayLabels = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

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
        {/* Hero profile */}
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

            <div className="flex flex-col items-center gap-4 sm:flex-row">
              {/* Streak */}
              <div className="rounded border border-white/15 bg-white/10 px-5 py-4 text-center backdrop-blur">
                <Zap className="mx-auto h-6 w-6 text-sakura" />
                <p className="mt-2 font-mincho text-4xl text-washi">{stats.streak}</p>
                <p className="mt-1 text-sm font-semibold text-washi/80">ngày liên tiếp</p>
              </div>

              {/* Completion ring */}
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
                <p className="mt-3 text-sm font-semibold text-washi/80">Tiến độ bài học</p>
              </div>
            </div>
          </div>
          {error ? <p className="mt-5 rounded bg-vermilion/20 p-3 text-sm text-washi">{error}</p> : null}
        </section>

        {/* Stats grid */}
        <section className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {[
            { icon: BookOpenText, label: 'Bài hoàn thành', value: stats.completed },
            { icon: Target, label: 'Cần ôn thêm', value: stats.review },
            { icon: Flame, label: 'Từ còn yếu', value: stats.weak },
            { icon: Trophy, label: 'Đã thuộc', value: stats.known },
            { icon: BarChart3, label: 'Điểm trung bình', value: `${stats.avg}%` },
          ].map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.article 
                key={item.label} 
                className="zen-glass zen-hover p-5"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05, duration: 0.3 }}
              >
                <Icon className="h-5 w-5 text-vermilion" />
                <p className="mt-4 font-mincho text-4xl">{item.value}</p>
                <p className="mt-1 text-sm font-semibold text-ink/65">{item.label}</p>
              </motion.article>
            );
          })}
        </section>

        {/* Activity heatmap + recent activity */}
        <section className="mb-8">
          <article className="zen-glass p-6">
            <p className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-vermilion">
              <BarChart3 className="h-4 w-4" />
              Hoạt động luyện tập
            </p>
            <h2 className="font-mincho text-3xl">8 tuần gần nhất</h2>

            <div className="mt-5 overflow-x-auto">
              <div className="flex gap-1.5">
                {/* Day-of-week labels column */}
                <div className="flex flex-col gap-1.5">
                  {/* Spacer cho hàng tháng */}
                  <div className="h-4 w-5" />
                  {dayLabels.map((d) => (
                    <span key={d} className="flex h-5 w-5 items-center justify-center text-[10px] font-semibold text-ink/45">
                      {d}
                    </span>
                  ))}
                </div>

                {/* Weekly columns với month label trên đầu */}
                {weeklyActivity.map((week, wi) => {
                  // Hiển thị nhãn tháng nếu khác tuần trước
                  const showMonth = wi === 0 || week.monthLabel !== weeklyActivity[wi - 1].monthLabel;
                  return (
                    <div key={wi} className="flex flex-col gap-1.5">
                      {/* Month label hàng đầu */}
                      <div className="flex h-4 items-center">
                        {showMonth ? (
                          <span className="whitespace-nowrap text-[10px] font-semibold text-ink/50">
                            {week.monthLabel}
                          </span>
                        ) : null}
                      </div>
                      {week.days.map((day) => {
                        const intensity = day.count === 0 ? 0 : Math.ceil((day.count / maxCount) * 4);
                        const bg =
                          intensity === 0
                            ? 'bg-mist'
                            : intensity === 1
                              ? 'bg-sakura/30'
                              : intensity === 2
                                ? 'bg-sakura/60'
                                : intensity === 3
                                  ? 'bg-vermilion/50'
                                  : 'bg-vermilion';
                        const isToday = day.date === new Date().toISOString().slice(0, 10);
                        return (
                          <div
                            key={day.date}
                            title={`${day.date}: ${day.count} lượt luyện`}
                            className={`h-5 w-5 rounded-sm transition-colors ${bg} ${isToday ? 'ring-2 ring-vermilion/60' : ''}`}
                          />
                        );
                      })}
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs text-ink/50">
                <span>Ít</span>
                {['bg-mist', 'bg-sakura/30', 'bg-sakura/60', 'bg-vermilion/50', 'bg-vermilion'].map((c, i) => (
                  <div key={i} className={`h-3.5 w-3.5 rounded-sm ${c}`} />
                ))}
                <span>Nhiều</span>
              </div>
            </div>
          </article>
        </section>

        {/* Overview + recent activity */}
        <section className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <article className="zen-glass p-6">
            <p className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-vermilion">
              <CalendarDays className="h-4 w-4" />
              Tổng quan
            </p>
            <h2 className="font-mincho text-3xl">Nhịp học hiện tại</h2>
            <div className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between rounded bg-washi px-4 py-3">
                <span className="text-ink/65">Chuỗi ngày học</span>
                <span className="font-semibold text-indigo">{stats.streak} ngày 🔥</span>
              </div>
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
              {activities.map((activity, index) => (
                <motion.div 
                  key={activity.id} 
                  className="zen-hover flex items-center justify-between gap-4 rounded border border-indigo/10 bg-washi px-4 py-3 text-sm"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05, duration: 0.3 }}
                >
                  <div>
                    <p className="font-semibold text-indigo">{activity.type}</p>
                    <p className="mt-1 text-xs text-ink/60">{formatDate(activity.date)}</p>
                  </div>
                  <span className="rounded bg-sakura/25 px-3 py-1 font-semibold text-indigo">{activity.score}</span>
                </motion.div>
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

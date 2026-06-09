import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  AlertCircle,
  ArrowRight,
  BookOpenText,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Flame,
  Layers3,
  LoaderCircle,
  Map,
  Search,
  Target,
  Trophy,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';

function getLessonTitle(lesson, index) {
  return lesson?.title || lesson?.name || lesson?.lesson_title || `Bài ${index + 1}`;
}

function getLessonDetail(lesson) {
  return lesson?.description || lesson?.summary || lesson?.content || 'Nội dung bài học đã sẵn sàng.';
}

function getLessonNumber(lesson, index) {
  const match = getLessonTitle(lesson, index).match(/\d+/);
  return match ? match[0] : String(index + 1).padStart(2, '0');
}

function getSortableLessonNumber(lesson, index) {
  const parsed = Number.parseInt(getLessonNumber(lesson, index), 10);
  return Number.isNaN(parsed) ? index + 1 : parsed;
}

function DashboardSkeleton() {
  return (
    <main className="min-h-screen px-5 py-6 text-indigo sm:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 border-b border-indigo/10 pb-6">
          <div className="skeleton-line h-4 w-32" />
          <div className="skeleton-line mt-4 h-10 w-72 max-w-full" />
          <div className="skeleton-line mt-3 h-4 w-96 max-w-full" />
        </div>
        <section className="grid gap-5 lg:grid-cols-12">
          <div className="zen-glass p-8 lg:col-span-7">
            <div className="skeleton-line h-4 w-28" />
            <div className="skeleton-line mt-5 h-12 w-3/4" />
            <div className="skeleton-line mt-4 h-4 w-full" />
            <div className="skeleton-line mt-3 h-4 w-2/3" />
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {[0, 1, 2].map((item) => (
                <div key={item} className="rounded border border-indigo/10 bg-washi p-4">
                  <div className="skeleton-line h-3 w-16" />
                  <div className="skeleton-line mt-3 h-5 w-24" />
                </div>
              ))}
            </div>
          </div>
          <div className="zen-glass p-6 lg:col-span-5">
            <div className="skeleton-line h-4 w-28" />
            <div className="mt-6 space-y-5">
              {[0, 1, 2].map((item) => (
                <div key={item} className="flex items-center gap-4">
                  <div className="skeleton-line h-12 w-12 rounded-full" />
                  <div className="flex-1">
                    <div className="skeleton-line h-4 w-32" />
                    <div className="skeleton-line mt-3 h-2 w-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>
          {[0, 1, 2].map((item) => (
            <div key={item} className="zen-glass p-6 lg:col-span-4">
              <div className="skeleton-line h-5 w-5" />
              <div className="skeleton-line mt-5 h-10 w-20" />
              <div className="skeleton-line mt-4 h-4 w-28" />
              <div className="skeleton-line mt-3 h-4 w-36" />
            </div>
          ))}
        </section>
        <div className="mt-8 grid gap-5 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((item) => (
            <div key={item} className="zen-glass p-6">
              <div className="skeleton-line h-4 w-16" />
              <div className="skeleton-line mt-4 h-8 w-3/4" />
              <div className="skeleton-line mt-4 h-4 w-full" />
              <div className="skeleton-line mt-3 h-4 w-2/3" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

function EmptyState() {
  return (
    <motion.div
      className="zen-glass p-10 text-center"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="pointer-events-none font-mincho text-8xl leading-none text-indigo/10">学</div>
      <h2 className="mt-4 font-mincho text-3xl text-indigo">Chưa có bài học nào</h2>
      <p className="mx-auto mt-3 max-w-sm text-sm leading-7 text-ink/65">
        Chưa có bài học nào trong hệ thống. Quản trị viên có thể thêm bài học từ trang quản trị.
      </p>
      <Link
        to="/search"
        className="zen-shimmer mt-6 inline-flex items-center gap-2 rounded bg-indigo px-5 py-3 text-sm font-semibold text-washi shadow-soft"
      >
        <Search className="h-4 w-4" />
        Tìm kiếm nội dung
      </Link>
    </motion.div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [lessons, setLessons] = useState([]);
  const [progress, setProgress] = useState({});
  const [counts, setCounts] = useState({ vocabulary: 0, grammar: 0, kanji: 0 });
  const [loadingLessons, setLoadingLessons] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [levelFilter, setLevelFilter] = useState('all');
  const [pageSize, setPageSize] = useState(8);
  const [currentPage, setCurrentPage] = useState(1);

  async function loadDashboard() {
    setLoadingLessons(true);
    setError('');

    const [lessonsResult, vocabularyResult, grammarResult, kanjiResult, progressResult] =
      await Promise.all([
        supabase.from('lessons').select('*').order('created_at', { ascending: false }),
        supabase.from('vocabulary').select('id', { count: 'exact', head: true }),
        supabase.from('grammar').select('id', { count: 'exact', head: true }),
        supabase.from('kanji').select('id', { count: 'exact', head: true }),
        user?.id
          ? supabase.from('user_lesson_progress').select('*').eq('user_id', user.id)
          : Promise.resolve({ data: [], error: null }),
      ]);

    if (lessonsResult.error) {
      setError(lessonsResult.error.message);
      setLoadingLessons(false);
      return;
    }

    setLessons(lessonsResult.data ?? []);
    setProgress(Object.fromEntries((progressResult.data ?? []).map((item) => [item.lesson_id, item])));
    setCounts({
      vocabulary: vocabularyResult.count ?? 0,
      grammar: grammarResult.count ?? 0,
      kanji: kanjiResult.count ?? 0,
    });
    setLoadingLessons(false);
  }

  useEffect(() => {
    loadDashboard();
  }, [user?.id]);

  useEffect(() => {
    setCurrentPage(1);
  }, [levelFilter, pageSize, searchTerm]);

  const lessonLevels = useMemo(() => {
    const levels = lessons
      .map((lesson) => lesson.jlpt_level || lesson.level || lesson.category)
      .filter(Boolean);
    return [...new Set(levels)].sort();
  }, [lessons]);

  const sortedLessons = useMemo(
    () =>
      [...lessons].sort((first, second) => {
        const firstNumber = getSortableLessonNumber(first, 0);
        const secondNumber = getSortableLessonNumber(second, 0);
        if (firstNumber !== secondNumber) return firstNumber - secondNumber;
        return getLessonTitle(first, 0).localeCompare(getLessonTitle(second, 0));
      }),
    [lessons],
  );

  const filteredLessons = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return sortedLessons.filter((lesson, index) => {
      const title = getLessonTitle(lesson, index).toLowerCase();
      const detail = getLessonDetail(lesson).toLowerCase();
      const level = lesson.jlpt_level || lesson.level || lesson.category || '';
      return (
        (normalizedSearch.length === 0 ||
          title.includes(normalizedSearch) ||
          detail.includes(normalizedSearch)) &&
        (levelFilter === 'all' || level === levelFilter)
      );
    });
  }, [levelFilter, searchTerm, sortedLessons]);

  const totalPages = Math.max(1, Math.ceil(filteredLessons.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * pageSize;
  const pageEnd = Math.min(pageStart + pageSize, filteredLessons.length);
  const paginatedLessons = filteredLessons.slice(pageStart, pageEnd);

  const progressItems = Object.values(progress);
  const completedLessons = progressItems.filter((item) => item.status === 'completed').length;
  const reviewLessons = progressItems.filter((item) => item.status === 'review').length;
  const todayKey = new Date().toISOString().slice(0, 10);
  const studiedToday = progressItems.some((item) => item.last_activity_at?.slice(0, 10) === todayKey);

  // Level progress based on user's actual completed lessons
  const n5Lessons = lessons.filter((l) => (l.jlpt_level || '').toUpperCase() === 'N5');
  const n4Lessons = lessons.filter((l) => (l.jlpt_level || '').toUpperCase() === 'N4');
  const n3Lessons = lessons.filter((l) => (l.jlpt_level || '').toUpperCase() === 'N3');

  function getLevelProgress(levelLessons) {
    if (!levelLessons.length) return 0;
    const done = levelLessons.filter((l) => progress[l.id]?.status === 'completed').length;
    return Math.round((done / levelLessons.length) * 100);
  }

  const levelProgress = {
    N5: getLevelProgress(n5Lessons),
    N4: getLevelProgress(n4Lessons),
    N3: getLevelProgress(n3Lessons),
  };

  const levelLessonsMap = { N5: n5Lessons, N4: n4Lessons, N3: n3Lessons };

  const pathLessons = sortedLessons.slice(0, 8);
  const nextPathIndex = Math.max(
    0,
    pathLessons.findIndex((lesson) => progress[lesson.id]?.status !== 'completed'),
  );
  const latestProgress = progressItems
    .filter((item) => item.status !== 'completed')
    .sort((first, second) => new Date(second.last_activity_at || 0) - new Date(first.last_activity_at || 0))[0];
  const nextLesson =
    sortedLessons.find((lesson) => lesson.id === latestProgress?.lesson_id) ||
    pathLessons[nextPathIndex] ||
    filteredLessons[0] ||
    sortedLessons[0];
  const nextLessonProgress = nextLesson ? progress[nextLesson.id] : null;

  if (loadingLessons && lessons.length === 0) {
    return <DashboardSkeleton />;
  }

  return (
    <main className="min-h-screen px-5 py-6 text-indigo sm:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-col gap-5 border-b border-indigo/10 pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-vermilion">
              Tổng quan
            </p>
            <h1 className="mt-2 font-mincho text-4xl">Bảng học tập</h1>
            <p className="mt-2 text-sm text-ink/70">Theo dõi bài học, ôn tập và tiến độ của bạn.</p>
          </div>
        </header>

        <section className="mb-8 grid gap-5">
          <motion.article
            className="quest-hero zen-glass p-8 text-washi"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
          >
            <div className="absolute -right-10 -top-14 h-52 w-52 rounded-full bg-white/10 blur-2xl" />
            <div className="absolute -bottom-16 left-10 h-44 w-44 rounded-full bg-vermilion/25 blur-2xl" />
            <div className="pointer-events-none absolute right-8 top-4 font-mincho text-[9rem] leading-none text-white/10">
              学
            </div>
            <p className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-sakura">
              <Target className="h-4 w-4" />
              Hôm nay
            </p>
            <h2 className="font-mincho text-5xl leading-tight">
              15 phút học tập có mục tiêu
            </h2>
            <p className="mt-5 max-w-2xl leading-7 text-washi/80">
              Ôn nhanh lý thuyết, làm một quiz ngắn, sau đó quay lại các câu sai.
              Tập trung vào một bài mỗi lần để giữ nhịp học nhẹ nhưng đều.
            </p>
            {nextLesson ? (
              <div className="mt-6 rounded border border-white/15 bg-white/10 p-4 backdrop-blur">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sakura">
                  Tiếp tục học
                </p>
                <h3 className="mt-2 truncate font-mincho text-2xl text-washi">
                  {getLessonTitle(nextLesson, 0)}
                </h3>
                <p className="mt-2 text-sm text-washi/70">
                  {nextLessonProgress?.last_total
                    ? `Điểm gần nhất: ${nextLessonProgress.last_score}/${nextLessonProgress.last_total}`
                    : 'Chưa có điểm gần nhất'}
                </p>
              </div>
            ) : null}
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {['Ôn lý thuyết', 'Làm quiz ngắn', 'Sửa câu sai'].map((step, index) => (
                <div key={step} className="rounded border border-white/15 bg-white/10 px-4 py-3 backdrop-blur">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sakura">
                    Bước {index + 1}
                  </p>
                  <p className="mt-1 font-semibold text-washi">{step}</p>
                </div>
              ))}
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              {nextLesson ? (
                <>
                  <Link
                    to={`/lessons/${nextLesson.id}`}
                    className="zen-shimmer inline-flex items-center gap-2 rounded bg-washi px-5 py-3 text-sm font-semibold text-indigo shadow-soft"
                  >
                    Bắt đầu học
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    to={`/lessons/${nextLesson.id}/exercises`}
                    className="inline-flex items-center gap-2 rounded border border-white/25 px-5 py-3 text-sm font-semibold text-washi"
                  >
                    Tạo quiz nhanh
                  </Link>
                  <Link
                    to="/review/today"
                    className="inline-flex items-center gap-2 rounded border border-white/25 px-5 py-3 text-sm font-semibold text-washi"
                  >
                    Ôn hôm nay
                  </Link>
                  <Link
                    to="/mistakes"
                    className="inline-flex items-center gap-2 rounded border border-white/25 px-5 py-3 text-sm font-semibold text-washi"
                  >
                    Ôn câu sai
                  </Link>
                </>
              ) : null}
            </div>
          </motion.article>

          <motion.aside
            className="grid gap-4 lg:grid-cols-12"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08, duration: 0.45, ease: 'easeOut' }}
          >
            <article className="zen-glass p-5 lg:col-span-6">
              <p className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-vermilion">
                <Map className="h-4 w-4" />
                Lộ trình học
              </p>
              <div className="space-y-3">
                {[
                  { level: 'N5', lessonList: n5Lessons },
                  { level: 'N4', lessonList: n4Lessons },
                  { level: 'N3', lessonList: n3Lessons },
                ].map(({ level, lessonList }, index) => {
                  const pct = levelProgress[level];
                  const completedCount = progressItems.filter(
                    (p) => p.status === 'completed' && lessonList.some((l) => l.id === p.lesson_id),
                  ).length;
                  const active = index === 0;
                  return (
                    <div key={level} className="flex items-center gap-3 rounded border border-indigo/10 bg-washi/70 p-3">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-mincho text-base shadow-soft ${
                          active ? 'bg-indigo text-washi' : 'bg-washi text-indigo'
                        }`}
                      >
                        {level}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3 text-sm">
                          <span className="font-semibold text-indigo">Lộ trình {level}</span>
                          <span className="text-ink/60">{lessonList.length} bài</span>
                        </div>
                        <div className="mt-1.5 h-1.5 overflow-hidden rounded bg-mist">
                          <div
                            className="h-full rounded bg-gradient-to-r from-vermilion to-sakura transition-all duration-700"
                            style={{ width: `${lessonList.length > 0 ? Math.max(pct, 4) : 0}%` }}
                          />
                        </div>
                        {lessonList.length > 0 && (
                          <p className="mt-1 text-xs text-ink/50">
                            {completedCount}/{lessonList.length} hoàn thành
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </article>

            <div className="grid gap-3 sm:grid-cols-3 lg:col-span-6">
              {[
                { icon: Trophy, title: 'Hoàn thành', value: completedLessons, detail: `/ ${lessons.length} bài` },
                { icon: Flame, title: 'Cần ôn', value: reviewLessons, detail: 'bài cần sửa' },
                { icon: CalendarDays, title: 'Hôm nay', value: studiedToday ? 'Xong ✓' : '0/1', detail: 'mục tiêu ngày', href: '/review/today' },
              ].map((item) => {
                const Icon = item.icon;
                const content = (
                  <>
                    <Icon className="h-4 w-4 text-vermilion" />
                    <p className="mt-3 font-mincho text-3xl leading-none">{item.value}</p>
                    <p className="mt-2 text-sm font-semibold text-indigo">{item.title}</p>
                    <p className="mt-1 truncate text-xs text-ink/65">{item.detail}</p>
                  </>
                );
                return item.href ? (
                  <Link key={item.title} to={item.href} className="zen-glass zen-hover p-4">
                    {content}
                  </Link>
                ) : (
                  <article key={item.title} className="zen-glass zen-hover p-4">
                    {content}
                  </article>
                );
              })}
            </div>
          </motion.aside>
        </section>

        {pathLessons.length > 0 ? (
          <motion.section
            className="zen-glass mb-7 p-4"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12, duration: 0.4, ease: 'easeOut' }}
          >
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-vermilion">
                  <Layers3 className="h-4 w-4" />
                  Lộ trình học
                </p>
                <h2 className="mt-1 font-mincho text-2xl text-indigo">Đường học gần nhất</h2>
              </div>
              <p className="text-sm font-semibold text-ink/60">
                {completedLessons}/{lessons.length} bài đã hoàn thành
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-8">
              {pathLessons.map((lesson, index) => {
                const lessonProgress = progress[lesson.id];
                const completed = lessonProgress?.status === 'completed';
                const current = index === nextPathIndex && !completed;
                return (
                  <Link
                    key={lesson.id}
                    to={`/lessons/${lesson.id}`}
                    className={`zen-hover group rounded border px-3 py-3 text-center transition ${
                      completed
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : current
                          ? 'border-vermilion/40 bg-sakura/20 text-indigo shadow-soft'
                          : 'border-indigo/10 bg-washi text-ink/65'
                    }`}
                  >
                    <span className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-white font-mincho text-base shadow-soft">
                      {completed ? <CheckCircle2 className="h-5 w-5" /> : getLessonNumber(lesson, index)}
                    </span>
                    <span className="mt-2 block truncate text-xs font-semibold">
                      {getLessonTitle(lesson, index)}
                    </span>
                    <span className="mt-1 block text-[10px] uppercase tracking-[0.12em]">
                      {completed ? 'Đã xong' : current ? 'Tiếp theo' : 'Chưa mở'}
                    </span>
                  </Link>
                );
              })}
            </div>
          </motion.section>
        ) : null}

        <section id="lessons">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-vermilion">
                Bản đồ học tập
              </p>
              <h2 className="font-mincho text-3xl">Lộ trình bài học</h2>
            </div>
            {loadingLessons ? <LoaderCircle className="h-5 w-5 animate-spin text-vermilion" /> : null}
          </div>

          <div className="zen-glass mb-5 p-4">
            <div className="grid gap-3 lg:grid-cols-[1fr_170px_150px]">
              <label className="flex items-center gap-3 rounded border border-indigo/10 bg-washi px-4 py-3">
                <Search className="h-4 w-4 shrink-0 text-vermilion" />
                <input
                  className="w-full bg-transparent text-sm text-indigo placeholder:text-ink/40 focus:outline-none"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Tìm bài học..."
                />
              </label>
              <select
                className="rounded border border-indigo/10 bg-washi px-4 py-3 text-sm font-semibold text-indigo focus:outline-none"
                value={levelFilter}
                onChange={(event) => setLevelFilter(event.target.value)}
              >
                <option value="all">Tất cả cấp độ</option>
                {lessonLevels.map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
              <select
                className="rounded border border-indigo/10 bg-washi px-4 py-3 text-sm font-semibold text-indigo focus:outline-none"
                value={pageSize}
                onChange={(event) => setPageSize(Number(event.target.value))}
              >
                {[6, 8, 12, 16].map((size) => (
                  <option key={size} value={size}>
                    {size} / trang
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error ? (
            <div className="flex items-start gap-3 rounded border border-vermilion/20 bg-vermilion/10 p-5 text-sm leading-6 text-indigo">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-vermilion" />
              <p>Không tải được bài học: {error}</p>
            </div>
          ) : null}

          {!error && lessons.length === 0 && !loadingLessons ? (
            <EmptyState />
          ) : null}

          {!error && paginatedLessons.length > 0 ? (
            <>
              <div className="quest-map grid gap-5 lg:grid-cols-6">
                {paginatedLessons.map((lesson, index) => {
                  const absoluteIndex = pageStart + index;
                  const featured = index % 5 === 0;
                  const span = featured ? 'lg:col-span-4' : 'lg:col-span-2';
                  const lessonProgress = progress[lesson.id];
                  const complete = lessonProgress?.status === 'completed';
                  const review = lessonProgress?.status === 'review';
                  return (
                    <motion.article
                      key={lesson.id ?? getLessonTitle(lesson, absoluteIndex)}
                      className={`quest-node zen-glass zen-hover group p-5 ${span}`}
                      initial={{ opacity: 0, y: 14 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: '-40px' }}
                      transition={{ delay: Math.min(index * 0.04, 0.18), duration: 0.35 }}
                    >
                      <div className="absolute right-4 top-4">
                        {complete ? (
                          <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                        ) : review ? (
                          <span className="rounded bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">
                            Cần ôn
                          </span>
                        ) : (
                          <span className="rounded bg-indigo/10 px-2 py-1 text-xs font-semibold text-indigo">
                            Mới
                          </span>
                        )}
                      </div>
                      <div className="absolute -right-4 -top-8 font-mincho text-8xl leading-none text-indigo opacity-[0.06] transition group-hover:scale-110">
                        {getLessonNumber(lesson, absoluteIndex)}
                      </div>
                      <Link to={`/lessons/${lesson.id}`} className="block">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-vermilion">
                          {lesson.jlpt_level || lesson.level || lesson.category || 'Bài học'}
                        </p>
                        <h3 className="mt-2 font-mincho text-2xl text-indigo">
                          {getLessonTitle(lesson, absoluteIndex)}
                        </h3>
                        <p className="mt-3 line-clamp-2 text-sm leading-6 text-ink/75">
                          {getLessonDetail(lesson)}
                        </p>
                        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                          {lessonProgress?.last_total ? (
                            <p className="rounded bg-washi px-3 py-2 text-sm font-semibold text-indigo">
                              Điểm gần nhất: {lessonProgress.last_score}/{lessonProgress.last_total}
                            </p>
                          ) : (
                            <p className="rounded bg-sakura/20 px-3 py-2 text-sm font-semibold text-vermilion">
                              Chưa luyện
                            </p>
                          )}
                          <span className="inline-flex items-center gap-2 rounded bg-indigo px-4 py-2 text-sm font-semibold text-washi shadow-soft transition group-hover:bg-vermilion">
                            Vào bài
                            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                          </span>
                        </div>
                      </Link>
                    </motion.article>
                  );
                })}
              </div>
              <div className="mt-6 flex flex-col gap-3 text-sm text-ink/70 sm:flex-row sm:items-center sm:justify-between">
                <p>
                  Hiển thị <span className="font-semibold text-indigo">{pageStart + 1}–{pageEnd}</span> /{' '}
                  <span className="font-semibold text-indigo">{filteredLessons.length}</span> bài
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                    disabled={safePage === 1}
                    className="inline-flex items-center gap-2 rounded border border-indigo/10 bg-white/80 px-3 py-2 font-semibold text-indigo shadow-soft disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Trước
                  </button>
                  <span className="rounded bg-sakura/20 px-3 py-2 font-semibold text-indigo">
                    {safePage} / {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                    disabled={safePage === totalPages}
                    className="inline-flex items-center gap-2 rounded border border-indigo/10 bg-white/80 px-3 py-2 font-semibold text-indigo shadow-soft disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    Sau
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </>
          ) : null}
        </section>
      </div>
    </main>
  );
}

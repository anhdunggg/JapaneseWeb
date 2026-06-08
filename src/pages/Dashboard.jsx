import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  BookOpenText,
  ChevronLeft,
  ChevronRight,
  Layers3,
  LoaderCircle,
  LogOut,
  Search,
  Settings,
  Sparkles,
  Sprout,
  Target,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';

function getLessonTitle(lesson, index) {
  return (
    lesson.title ||
    lesson.name ||
    lesson.lesson_title ||
    lesson.japanese_title ||
    `Bài ${index + 1}`
  );
}

function getLessonDetail(lesson) {
  return (
    lesson.description ||
    lesson.summary ||
    lesson.content ||
    lesson.notes ||
    'Nội dung bài học đã sẵn sàng để ôn tập.'
  );
}

function getLessonNumber(lesson, index) {
  const match = getLessonTitle(lesson, index).match(/\d+/);
  return match ? match[0] : String(index + 1).padStart(2, '0');
}

function getSortableLessonNumber(lesson, index) {
  const parsed = Number.parseInt(getLessonNumber(lesson, index), 10);
  return Number.isNaN(parsed) ? index + 1 : parsed;
}

export default function Dashboard() {
  const { user, signOut, isAdmin } = useAuth();
  const [lessons, setLessons] = useState([]);
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

    const [lessonsResult, vocabularyResult, grammarResult, kanjiResult] =
      await Promise.all([
        supabase.from('lessons').select('*').order('created_at', { ascending: false }),
        supabase.from('vocabulary').select('id', { count: 'exact', head: true }),
        supabase.from('grammar').select('id', { count: 'exact', head: true }),
        supabase.from('kanji').select('id', { count: 'exact', head: true }),
      ]);

    if (lessonsResult.error) {
      setError(lessonsResult.error.message);
      setLoadingLessons(false);
      return;
    }

    setLessons(lessonsResult.data ?? []);
    setCounts({
      vocabulary: vocabularyResult.count ?? 0,
      grammar: grammarResult.count ?? 0,
      kanji: kanjiResult.count ?? 0,
    });
    setLoadingLessons(false);
  }

  useEffect(() => {
    loadDashboard();
  }, []);

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
      const matchesSearch =
        normalizedSearch.length === 0 ||
        title.includes(normalizedSearch) ||
        detail.includes(normalizedSearch);
      const matchesLevel = levelFilter === 'all' || level === levelFilter;

      return matchesSearch && matchesLevel;
    });
  }, [levelFilter, searchTerm, sortedLessons]);

  const totalPages = Math.max(1, Math.ceil(filteredLessons.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * pageSize;
  const pageEnd = Math.min(pageStart + pageSize, filteredLessons.length);
  const paginatedLessons = filteredLessons.slice(pageStart, pageEnd);
  const nextLesson = filteredLessons[0] || sortedLessons[0];

  const summary = [
    { title: 'Bài học', value: lessons.length, detail: 'phòng học đang có' },
    { title: 'Từ vựng', value: counts.vocabulary, detail: 'mục để ôn tập' },
    {
      title: 'Ngữ pháp + Kanji',
      value: counts.grammar + counts.kanji,
      detail: `${counts.grammar} ngữ pháp, ${counts.kanji} kanji`,
    },
  ];

  return (
    <main className="min-h-screen px-5 py-6 text-indigo sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-col gap-5 border-b border-indigo/10 pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="zen-hover flex h-12 w-12 items-center justify-center rounded bg-white shadow-soft">
              <Sprout className="h-6 w-6 text-vermilion" />
            </div>
            <div>
              <p className="text-sm font-medium text-ink/70">{user?.email}</p>
              <h1 className="font-mincho text-3xl">Không gian học tiếng Nhật</h1>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {isAdmin ? (
              <Link
                to="/admin"
                className="zen-hover inline-flex items-center justify-center gap-2 rounded border border-indigo/10 bg-white/85 px-4 py-2 text-sm font-semibold text-indigo shadow-soft transition hover:border-sakura"
              >
                <Settings className="h-4 w-4" />
                Quản trị
              </Link>
            ) : null}
            <button
              type="button"
              onClick={signOut}
              className="zen-hover inline-flex items-center justify-center gap-2 rounded border border-indigo/10 bg-white/85 px-4 py-2 text-sm font-semibold text-indigo shadow-soft transition hover:border-sakura"
            >
              <LogOut className="h-4 w-4" />
              Đăng xuất
            </button>
          </div>
        </header>

        <section className="mb-8 grid auto-rows-[minmax(145px,auto)] gap-5 lg:grid-cols-6">
          <article className="zen-glass zen-hover p-7 lg:col-span-4 lg:row-span-2">
            <div className="zen-float absolute -right-16 -top-20 h-56 w-56 rounded-full bg-sakura/25 blur-3xl" />
            <div className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-vermilion via-sakura to-indigo" />
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-vermilion">
                  <Target className="h-4 w-4" />
                  Tiếp tục học
                </p>
                <h2 className="font-mincho text-4xl leading-tight text-indigo sm:text-5xl">
                  {nextLesson ? getLessonTitle(nextLesson, 0) : 'Chưa có bài học'}
                </h2>
                <p className="mt-5 max-w-2xl leading-7 text-ink/75">
                  {nextLesson
                    ? getLessonDetail(nextLesson)
                    : 'Khi có bài học, bạn có thể bắt đầu ôn lý thuyết và luyện tập tại đây.'}
                </p>
              </div>
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded bg-sakura/20 ring-1 ring-sakura/45">
                <Sparkles className="h-9 w-9 text-vermilion" />
              </div>
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              {nextLesson ? (
                <>
                  <Link
                    to={`/lessons/${nextLesson.id}`}
                    className="zen-shimmer inline-flex items-center gap-2 rounded bg-indigo px-5 py-3 text-sm font-semibold text-washi shadow-soft transition hover:bg-indigo/95"
                  >
                    Vào bài học
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    to={`/lessons/${nextLesson.id}/exercises`}
                    className="zen-hover inline-flex items-center gap-2 rounded border border-indigo/10 bg-white/75 px-5 py-3 text-sm font-semibold text-indigo shadow-soft transition hover:border-sakura"
                  >
                    Luyện tập
                  </Link>
                </>
              ) : null}
            </div>
          </article>

          {summary.map((item) => (
            <article key={item.title} className="zen-glass zen-hover p-6 lg:col-span-2">
              <p className="text-sm font-semibold text-ink/65">{item.title}</p>
              <p className="mt-3 font-mincho text-4xl text-indigo">{item.value}</p>
              <p className="mt-3 text-sm leading-6 text-ink/70">{item.detail}</p>
            </article>
          ))}

          <article className="zen-hover rounded bg-vermilion/10 p-6 shadow-soft ring-1 ring-vermilion/20 lg:col-span-2">
            <p className="flex items-center gap-2 text-sm font-semibold text-vermilion">
              <BookOpenText className="h-4 w-4" />
              Gợi ý hôm nay
            </p>
            <p className="mt-4 font-mincho text-3xl text-indigo">15 phút ôn tập</p>
            <p className="mt-3 text-sm leading-6 text-ink/70">
              Chọn một bài, đọc nhanh từ vựng/ngữ pháp, rồi tạo quiz ngẫu nhiên.
            </p>
          </article>
        </section>

        <section id="lessons">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-vermilion">
                Danh sách bài học
              </p>
              <h2 className="font-mincho text-3xl">Lộ trình học</h2>
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
                <option value="all">Tất cả trình độ</option>
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

          {!error && !loadingLessons && lessons.length === 0 ? (
            <div className="zen-glass p-6 text-ink/70">Chưa có bài học nào.</div>
          ) : null}

          {!error && !loadingLessons && lessons.length > 0 && filteredLessons.length === 0 ? (
            <div className="zen-glass p-6 text-ink/70">Không có bài học khớp bộ lọc.</div>
          ) : null}

          {!error && paginatedLessons.length > 0 ? (
            <>
              <div className="grid auto-rows-[minmax(210px,auto)] gap-5 lg:grid-cols-6">
                {paginatedLessons.map((lesson, index) => {
                  const absoluteIndex = pageStart + index;
                  const featured = index % 7 === 0;
                  const compact = index % 7 === 5;
                  const span = featured ? 'lg:col-span-4' : compact ? 'lg:col-span-2' : 'lg:col-span-3';

                  return (
                    <article
                      key={lesson.id ?? getLessonTitle(lesson, absoluteIndex)}
                      className={`zen-glass zen-hover group p-6 ${span}`}
                    >
                      <div className="absolute -right-4 -top-8 font-mincho text-8xl leading-none text-indigo opacity-[0.05] transition group-hover:scale-110">
                        {getLessonNumber(lesson, absoluteIndex)}
                      </div>
                      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-sakura via-vermilion to-indigo/40" />
                      <Link to={`/lessons/${lesson.id}`} className="block">
                        <div className="mb-4 flex items-start justify-between gap-4">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-vermilion">
                              {lesson.jlpt_level || lesson.level || lesson.category || 'Bài học'}
                            </p>
                            <h3 className="mt-2 font-mincho text-2xl text-indigo">
                              {getLessonTitle(lesson, absoluteIndex)}
                            </h3>
                          </div>
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded bg-sakura/20 transition group-hover:bg-vermilion">
                            <Layers3 className="h-5 w-5 text-vermilion transition group-hover:text-white" />
                          </div>
                        </div>
                        <p className="line-clamp-3 text-sm leading-6 text-ink/75">
                          {getLessonDetail(lesson)}
                        </p>
                        <div className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-vermilion">
                          Mở bài học
                          <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                        </div>
                      </Link>
                    </article>
                  );
                })}
              </div>
              <div className="mt-6 flex flex-col gap-3 text-sm text-ink/70 sm:flex-row sm:items-center sm:justify-between">
                <p>
                  Hiển thị <span className="font-semibold text-indigo">{pageStart + 1}-{pageEnd}</span> /
                  <span className="font-semibold text-indigo"> {filteredLessons.length}</span> bài
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

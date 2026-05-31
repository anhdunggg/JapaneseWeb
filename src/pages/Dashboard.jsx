import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  BookOpenText,
  Layers3,
  LoaderCircle,
  LogOut,
  Sparkles,
  Sprout,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';

function getLessonTitle(lesson, index) {
  return (
    lesson.title ||
    lesson.name ||
    lesson.lesson_title ||
    lesson.japanese_title ||
    `Lesson ${index + 1}`
  );
}

function getLessonDetail(lesson) {
  return (
    lesson.description ||
    lesson.summary ||
    lesson.content ||
    lesson.notes ||
    'Lesson content is ready to review.'
  );
}

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const [lessons, setLessons] = useState([]);
  const [counts, setCounts] = useState({
    vocabulary: 0,
    grammar: 0,
    kanji: 0,
  });
  const [loadingLessons, setLoadingLessons] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    async function loadDashboard() {
      setLoadingLessons(true);
      setError('');

      const [
        lessonsResult,
        vocabularyResult,
        grammarResult,
        kanjiResult,
      ] = await Promise.all([
        supabase.from('lessons').select('*'),
        supabase.from('vocabulary').select('id', { count: 'exact', head: true }),
        supabase.from('grammar').select('id', { count: 'exact', head: true }),
        supabase.from('kanji').select('id', { count: 'exact', head: true }),
      ]);

      if (!mounted) return;

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

    loadDashboard();

    return () => {
      mounted = false;
    };
  }, []);

  const summary = useMemo(
    () => [
      {
        title: 'Lessons',
        value: lessons.length,
        detail: 'Lessons available from Supabase.',
      },
      {
        title: 'Vocabulary',
        value: counts.vocabulary,
        detail: 'Total vocabulary items in your database.',
      },
      {
        title: 'Grammar & Kanji',
        value: counts.grammar + counts.kanji,
        detail: `${counts.grammar} grammar points, ${counts.kanji} kanji entries.`,
      },
    ],
    [counts.grammar, counts.kanji, counts.vocabulary, lessons.length],
  );

  return (
    <main className="min-h-screen bg-washi px-5 py-6 text-indigo sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-10 flex flex-col gap-5 border-b border-indigo/10 pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded bg-white shadow-soft">
              <Sprout className="h-6 w-6 text-vermilion" />
            </div>
            <div>
              <p className="text-sm font-medium text-ink/70">Signed in as {user?.email}</p>
              <h1 className="font-mincho text-3xl">Mochi Dashboard</h1>
            </div>
          </div>
          <button
            type="button"
            onClick={signOut}
            className="inline-flex items-center justify-center gap-2 rounded border border-indigo/10 bg-white px-4 py-2 text-sm font-semibold text-indigo shadow-soft transition hover:border-sakura"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </header>

        <section className="mb-8 rounded bg-white/90 p-7 shadow-zen ring-1 ring-indigo/5">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-vermilion">
                <BookOpenText className="h-4 w-4" />
                Lesson room
              </p>
              <h2 className="font-mincho text-4xl">今日の学習</h2>
              <p className="mt-4 max-w-2xl leading-7 text-ink/75">
                Your Supabase lessons are now connected. Choose a lesson below to start
                reviewing its material.
              </p>
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded bg-sakura/30">
              <Sparkles className="h-7 w-7 text-vermilion" />
            </div>
          </div>
        </section>

        <section className="mb-8 grid gap-5 md:grid-cols-3">
          {summary.map((item) => (
            <article
              key={item.title}
              className="rounded bg-white/85 p-6 shadow-soft ring-1 ring-indigo/5"
            >
              <p className="text-sm font-semibold text-ink/65">{item.title}</p>
              <p className="mt-3 font-mincho text-3xl text-indigo">{item.value}</p>
              <p className="mt-3 text-sm leading-6 text-ink/70">{item.detail}</p>
            </article>
          ))}
        </section>

        <section>
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-vermilion">
                Lessons
              </p>
              <h2 className="font-mincho text-3xl">Your Study Path</h2>
            </div>
            {loadingLessons ? (
              <LoaderCircle className="h-5 w-5 animate-spin text-vermilion" />
            ) : null}
          </div>

          {error ? (
            <div className="flex items-start gap-3 rounded border border-vermilion/20 bg-vermilion/10 p-5 text-sm leading-6 text-indigo">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-vermilion" />
              <p>
                Could not load lessons: {error}. Check your table name, Row Level
                Security policies, and Supabase anon permissions.
              </p>
            </div>
          ) : null}

          {!error && !loadingLessons && lessons.length === 0 ? (
            <div className="rounded border border-indigo/10 bg-white/80 p-6 text-ink/70 shadow-soft">
              No lessons are visible yet. If Supabase already has data, check Row Level
              Security policies for the logged-in user.
            </div>
          ) : null}

          {!error && lessons.length > 0 ? (
            <div className="grid gap-5 md:grid-cols-2">
              {lessons.map((lesson, index) => (
                <Link
                  key={lesson.id ?? getLessonTitle(lesson, index)}
                  to={`/lessons/${lesson.id}`}
                  className="rounded bg-white/90 p-6 shadow-soft ring-1 ring-indigo/5 transition hover:-translate-y-0.5 hover:shadow-zen"
                >
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-vermilion">
                        {lesson.level || lesson.category || lesson.type || 'Lesson'}
                      </p>
                      <h3 className="mt-2 font-mincho text-2xl text-indigo">
                        {getLessonTitle(lesson, index)}
                      </h3>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded bg-mist">
                      <Layers3 className="h-5 w-5 text-vermilion" />
                    </div>
                  </div>
                  <p className="line-clamp-3 text-sm leading-6 text-ink/75">
                    {getLessonDetail(lesson)}
                  </p>
                  <div className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-vermilion">
                    Start lesson
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </Link>
              ))}
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}

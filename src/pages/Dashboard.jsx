import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  BookOpenText,
  Image,
  Layers3,
  LoaderCircle,
  LogOut,
  Pencil,
  Plus,
  Sparkles,
  Sprout,
  Trash2,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../supabaseClient";

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
    "Lesson content is ready to review."
  );
}

export default function Dashboard() {
  const { user, signOut, isAdmin } = useAuth();
  const [lessons, setLessons] = useState([]);
  const [lessonForm, setLessonForm] = useState({
    title: "",
    description: "",
    jlpt_level: "N5",
  });
  const [editingLessonId, setEditingLessonId] = useState("");
  const [counts, setCounts] = useState({
    vocabulary: 0,
    grammar: 0,
    kanji: 0,
  });
  const [loadingLessons, setLoadingLessons] = useState(true);
  const [savingLesson, setSavingLesson] = useState(false);
  const [error, setError] = useState("");

  async function loadDashboard() {
    setLoadingLessons(true);
    setError("");

    const [lessonsResult, vocabularyResult, grammarResult, kanjiResult] =
      await Promise.all([
        supabase
          .from("lessons")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase
          .from("vocabulary")
          .select("id", { count: "exact", head: true }),
        supabase.from("grammar").select("id", { count: "exact", head: true }),
        supabase.from("kanji").select("id", { count: "exact", head: true }),
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

  function resetLessonForm() {
    setLessonForm({ title: "", description: "", jlpt_level: "N5" });
    setEditingLessonId("");
  }

  function editLesson(lesson) {
    setEditingLessonId(lesson.id);
    setLessonForm({
      title: lesson.title || "",
      description: lesson.description || "",
      jlpt_level: lesson.jlpt_level || "N5",
    });
  }

  async function saveLesson(event) {
    event.preventDefault();
    setSavingLesson(true);
    setError("");

    const payload = {
      title: lessonForm.title.trim(),
      description: lessonForm.description.trim(),
      jlpt_level: lessonForm.jlpt_level.trim() || "N5",
    };

    const result = editingLessonId
      ? await supabase.from("lessons").update(payload).eq("id", editingLessonId)
      : await supabase.from("lessons").insert(payload);

    setSavingLesson(false);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    resetLessonForm();
    loadDashboard();
  }

  async function deleteLesson(lesson) {
    const confirmed = window.confirm(`Delete "${getLessonTitle(lesson, 0)}"?`);
    if (!confirmed) return;

    setError("");
    const { error: deleteError } = await supabase
      .from("lessons")
      .delete()
      .eq("id", lesson.id);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    loadDashboard();
  }

  const summary = useMemo(
    () => [
      {
        title: "Lessons",
        value: lessons.length,
        detail: "Lessons available from Supabase.",
      },
      {
        title: "Vocabulary",
        value: counts.vocabulary,
        detail: "Total vocabulary items in your database.",
      },
      {
        title: "Grammar & Kanji",
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
              <p className="text-sm font-medium text-ink/70">
                Signed in as {user?.email}
              </p>
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
                Choose a lesson below to start reviewing its material.
              </p>
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded bg-sakura/30">
              <Sparkles className="h-7 w-7 text-vermilion" />
            </div>
          </div>
          {isAdmin ? (
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/images/review"
                className="inline-flex items-center gap-2 rounded border border-indigo/10 bg-white px-4 py-2 text-sm font-semibold text-indigo shadow-soft transition hover:border-sakura"
              >
                <Image className="h-4 w-4" />
                Review vocabulary images
              </Link>
            </div>
          ) : null}
        </section>

        <section className="mb-8 grid gap-5 md:grid-cols-3">
          {summary.map((item) => (
            <article
              key={item.title}
              className="rounded bg-white/85 p-6 shadow-soft ring-1 ring-indigo/5"
            >
              <p className="text-sm font-semibold text-ink/65">{item.title}</p>
              <p className="mt-3 font-mincho text-3xl text-indigo">
                {item.value}
              </p>
              <p className="mt-3 text-sm leading-6 text-ink/70">
                {item.detail}
              </p>
            </article>
          ))}
        </section>

        {isAdmin ? (
          <section className="mb-8 rounded bg-white/90 p-6 shadow-zen ring-1 ring-indigo/5">
            <div className="mb-5">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-vermilion">
                Lesson management
              </p>
              <h2 className="mt-2 font-mincho text-3xl">
                {editingLessonId ? "Edit Lesson" : "Create Lesson"}
              </h2>
            </div>
            <form
              onSubmit={saveLesson}
              className="grid gap-4 lg:grid-cols-[1fr_1fr_120px_auto]"
            >
              <input
                className="rounded border border-indigo/10 bg-washi px-4 py-3 text-sm text-indigo focus:outline-none"
                value={lessonForm.title}
                onChange={(event) =>
                  setLessonForm((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
                placeholder="Lesson title"
                required
              />
              <input
                className="rounded border border-indigo/10 bg-washi px-4 py-3 text-sm text-indigo focus:outline-none"
                value={lessonForm.description}
                onChange={(event) =>
                  setLessonForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                placeholder="Short description"
              />
              <select
                className="rounded border border-indigo/10 bg-washi px-4 py-3 text-sm text-indigo focus:outline-none"
                value={lessonForm.jlpt_level}
                onChange={(event) =>
                  setLessonForm((current) => ({
                    ...current,
                    jlpt_level: event.target.value,
                  }))
                }
              >
                {["N5", "N4", "N3", "N2", "N1"].map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={savingLesson}
                  className="inline-flex items-center justify-center gap-2 rounded bg-indigo px-4 py-3 text-sm font-semibold text-washi shadow-soft disabled:opacity-60"
                >
                  {savingLesson ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  {editingLessonId ? "Save" : "Create"}
                </button>
                {editingLessonId ? (
                  <button
                    type="button"
                    onClick={resetLessonForm}
                    className="rounded border border-indigo/10 px-4 py-3 text-sm font-semibold text-indigo"
                  >
                    Cancel
                  </button>
                ) : null}
              </div>
            </form>
          </section>
        ) : null}

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
                Could not load lessons: {error}. Check your table name, Row
                Level Security policies, and Supabase anon permissions.
              </p>
            </div>
          ) : null}

          {!error && !loadingLessons && lessons.length === 0 ? (
            <div className="rounded border border-indigo/10 bg-white/80 p-6 text-ink/70 shadow-soft">
              No lessons are visible yet. If Supabase already has data, check
              Row Level Security policies for the logged-in user.
            </div>
          ) : null}

          {!error && lessons.length > 0 ? (
            <div className="grid gap-5 md:grid-cols-2">
              {lessons.map((lesson, index) => (
                <article
                  key={lesson.id ?? getLessonTitle(lesson, index)}
                  className="rounded bg-white/90 p-6 shadow-soft ring-1 ring-indigo/5 transition hover:-translate-y-0.5 hover:shadow-zen"
                >
                  <Link to={`/lessons/${lesson.id}`} className="block">
                    <div className="mb-4 flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-vermilion">
                          {lesson.jlpt_level ||
                            lesson.level ||
                            lesson.category ||
                            lesson.type ||
                            "Lesson"}
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
                  {isAdmin ? (
                    <div className="mt-5 flex gap-2 border-t border-indigo/10 pt-4">
                      <button
                        type="button"
                        onClick={() => editLesson(lesson)}
                        className="inline-flex items-center gap-2 rounded border border-indigo/10 px-3 py-2 text-sm font-semibold text-indigo"
                      >
                        <Pencil className="h-4 w-4" />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteLesson(lesson)}
                        className="inline-flex items-center gap-2 rounded border border-vermilion/20 px-3 py-2 text-sm font-semibold text-vermilion"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </button>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}

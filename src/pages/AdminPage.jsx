import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle,
  BookOpenText,
  Image,
  Layers3,
  LoaderCircle,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import ExerciseManager from '../components/ExerciseManager';
import LessonContentManager from '../components/LessonContentManager';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';

function titleForLesson(lesson, index = 0) {
  return lesson?.title || lesson?.name || lesson?.lesson_title || `Bài ${index + 1}`;
}

function detailForLesson(lesson) {
  return lesson?.description || lesson?.summary || lesson?.content || 'Chưa có mô tả.';
}

function getLessonNumber(lesson, index) {
  const match = titleForLesson(lesson, index).match(/\d+/);
  return match ? Number.parseInt(match[0], 10) : index + 1;
}

export default function AdminPage() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const { lessonId: routeLessonId } = useParams();
  const [lessons, setLessons] = useState([]);
  const [selectedLessonId, setSelectedLessonId] = useState('');
  const [lessonForm, setLessonForm] = useState({
    title: '',
    description: '',
    jlpt_level: 'N5',
  });
  const [editingLessonId, setEditingLessonId] = useState('');
  const [vocabulary, setVocabulary] = useState([]);
  const [grammar, setGrammar] = useState([]);
  const [kanji, setKanji] = useState([]);
  const [exercises, setExercises] = useState([]);
  const [activePanel, setActivePanel] = useState('content');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingLesson, setSavingLesson] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function loadLessons(nextSelectedId = routeLessonId || selectedLessonId) {
    setLoading(true);
    setError('');

    const { data, error: lessonError } = await supabase
      .from('lessons')
      .select('*')
      .order('created_at', { ascending: false });

    if (lessonError) {
      setError(lessonError.message);
      setLoading(false);
      return;
    }

    const sorted = [...(data ?? [])].sort((first, second) => {
      const firstNumber = getLessonNumber(first, 0);
      const secondNumber = getLessonNumber(second, 0);
      if (firstNumber !== secondNumber) return firstNumber - secondNumber;
      return titleForLesson(first).localeCompare(titleForLesson(second));
    });

    const nextId =
      nextSelectedId && sorted.some((lesson) => lesson.id === nextSelectedId)
        ? nextSelectedId
        : sorted[0]?.id || '';
    setLessons(sorted);
    setSelectedLessonId(nextId);
    if (nextId && routeLessonId !== nextId) {
      navigate(`/admin/lessons/${nextId}`, { replace: true });
    }
    setLoading(false);
  }

  async function loadLessonContent(lessonId) {
    if (!lessonId) {
      setVocabulary([]);
      setGrammar([]);
      setKanji([]);
      setExercises([]);
      return;
    }

    const [vocabularyResult, grammarResult, kanjiResult, exercisesResult] =
      await Promise.all([
        supabase.from('vocabulary').select('*').eq('lesson_id', lessonId),
        supabase.from('grammar').select('*').eq('lesson_id', lessonId),
        supabase.from('kanji').select('*').eq('lesson_id', lessonId),
        supabase
          .from('lesson_exercises')
          .select('*')
          .eq('lesson_id', lessonId)
          .order('created_at', { ascending: false }),
      ]);

    const firstError =
      vocabularyResult.error ||
      grammarResult.error ||
      kanjiResult.error ||
      exercisesResult.error;

    if (firstError) {
      setError(firstError.message);
      return;
    }

    setVocabulary(vocabularyResult.data ?? []);
    setGrammar(grammarResult.data ?? []);
    setKanji(kanjiResult.data ?? []);
    setExercises(exercisesResult.data ?? []);
  }

  useEffect(() => {
    if (isAdmin) loadLessons(routeLessonId);
  }, [isAdmin]);

  useEffect(() => {
    if (!routeLessonId) return;
    setSelectedLessonId(routeLessonId);
  }, [routeLessonId]);

  useEffect(() => {
    loadLessonContent(selectedLessonId);
  }, [selectedLessonId]);

  function resetLessonForm() {
    setLessonForm({ title: '', description: '', jlpt_level: 'N5' });
    setEditingLessonId('');
  }

  function editLesson(lesson) {
    setEditingLessonId(lesson.id);
    setLessonForm({
      title: lesson.title || '',
      description: lesson.description || '',
      jlpt_level: lesson.jlpt_level || 'N5',
    });
  }

  async function saveLesson(event) {
    event.preventDefault();
    setSavingLesson(true);
    setMessage('');
    setError('');

    const payload = {
      title: lessonForm.title.trim(),
      description: lessonForm.description.trim(),
      jlpt_level: lessonForm.jlpt_level || 'N5',
    };

    const result = editingLessonId
      ? await supabase.from('lessons').update(payload).eq('id', editingLessonId).select('id').single()
      : await supabase.from('lessons').insert(payload).select('id').single();

    setSavingLesson(false);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    setMessage(editingLessonId ? 'Đã lưu bài học.' : 'Đã tạo bài học.');
    const nextId = result.data?.id || selectedLessonId;
    resetLessonForm();
    if (nextId) navigate(`/admin/lessons/${nextId}`);
    loadLessons(nextId);
  }

  async function deleteLesson(lesson) {
    if (!window.confirm(`Xóa "${titleForLesson(lesson)}"?`)) return;

    const { error: deleteError } = await supabase
      .from('lessons')
      .delete()
      .eq('id', lesson.id);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setMessage('Đã xóa bài học.');
    resetLessonForm();
    navigate('/admin', { replace: true });
    loadLessons('');
  }

  const filteredLessons = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();
    if (!normalized) return lessons;

    return lessons.filter((lesson, index) => {
      return (
        titleForLesson(lesson, index).toLowerCase().includes(normalized) ||
        detailForLesson(lesson).toLowerCase().includes(normalized)
      );
    });
  }, [lessons, searchTerm]);

  const selectedLesson = lessons.find((lesson) => lesson.id === selectedLessonId);

  if (!isAdmin) {
    return (
      <main className="min-h-screen px-5 py-6 text-indigo sm:px-8">
        <div className="mx-auto max-w-4xl rounded border border-vermilion/20 bg-vermilion/10 p-5">
          Bạn không có quyền truy cập khu quản trị.
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-5 py-6 text-indigo sm:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-col gap-4 border-b border-indigo/10 pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-vermilion">
              Quản trị
            </p>
            <h1 className="font-mincho text-4xl">Quản trị nội dung học</h1>
          </div>
          <Link
            to="/images/review"
            className="zen-hover inline-flex items-center gap-2 rounded border border-indigo/10 bg-white/85 px-4 py-3 text-sm font-semibold text-indigo shadow-soft"
          >
            <Image className="h-4 w-4" />
            Duyệt ảnh từ vựng
          </Link>
        </header>

        {error ? (
          <div className="mb-5 flex items-start gap-3 rounded border border-vermilion/20 bg-vermilion/10 p-4 text-sm">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-vermilion" />
            <p>{error}</p>
          </div>
        ) : null}
        {message ? (
          <p className="mb-5 rounded bg-sakura/20 px-4 py-3 text-sm font-semibold text-indigo">
            {message}
          </p>
        ) : null}

        <section className="mb-8 grid gap-5 lg:grid-cols-[360px_1fr]">
          <aside className="zen-glass p-5">
            <div className="mb-4 flex items-center gap-3 rounded border border-indigo/10 bg-washi px-4 py-3">
              <Search className="h-4 w-4 shrink-0 text-vermilion" />
              <input
                className="w-full bg-transparent text-sm focus:outline-none"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Tìm bài để quản lý..."
              />
            </div>

            {loading ? (
              <div className="flex items-center gap-2 p-4 text-sm text-ink/70">
                <LoaderCircle className="h-4 w-4 animate-spin text-vermilion" />
                Đang tải bài học...
              </div>
            ) : null}

            <div className="max-h-[560px] overflow-auto rounded border border-indigo/10 bg-white/60">
              {filteredLessons.map((lesson, index) => {
                const selected = lesson.id === selectedLessonId;
                return (
                  <button
                    key={lesson.id}
                    type="button"
                    onClick={() => {
                      setSelectedLessonId(lesson.id);
                      navigate(`/admin/lessons/${lesson.id}`);
                    }}
                    className={`flex w-full gap-3 border-b border-indigo/10 p-3 text-left last:border-b-0 ${
                      selected ? 'bg-sakura/25' : 'hover:bg-washi'
                    }`}
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-white font-mincho text-indigo shadow-soft">
                      {getLessonNumber(lesson, index)}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-indigo">
                        {titleForLesson(lesson, index)}
                      </span>
                      <span className="block truncate text-sm text-ink/65">
                        {lesson.jlpt_level || 'Bài học'} - {detailForLesson(lesson)}
                      </span>
                      <span className="mt-2 inline-flex rounded bg-indigo px-3 py-1 text-xs font-semibold text-washi">
                        Quản lý nội dung
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </aside>

          <div className="space-y-5">
            <section className="zen-glass p-6">
              <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-vermilion">
                    Bài học
                  </p>
                  <h2 className="mt-2 font-mincho text-3xl">
                    {editingLessonId ? 'Sửa bài học' : 'Tạo bài học'}
                  </h2>
                </div>
                {selectedLesson ? (
                  <div className="flex flex-wrap gap-2">
                    <Link
                      to={`/lessons/${selectedLesson.id}`}
                      className="rounded border border-indigo/10 bg-white px-3 py-2 text-sm font-semibold text-indigo"
                    >
                      Xem bài
                    </Link>
                    <button
                      type="button"
                      onClick={() => editLesson(selectedLesson)}
                      className="inline-flex items-center gap-2 rounded border border-indigo/10 px-3 py-2 text-sm font-semibold text-indigo"
                    >
                      <Pencil className="h-4 w-4" />
                      Sửa
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteLesson(selectedLesson)}
                      className="inline-flex items-center gap-2 rounded border border-vermilion/20 px-3 py-2 text-sm font-semibold text-vermilion"
                    >
                      <Trash2 className="h-4 w-4" />
                      Xóa
                    </button>
                  </div>
                ) : null}
              </div>

              <form onSubmit={saveLesson} className="grid gap-3 lg:grid-cols-[1fr_1fr_120px_auto]">
                <input
                  className="rounded border border-indigo/10 bg-washi px-4 py-3 text-sm focus:outline-none"
                  value={lessonForm.title}
                  onChange={(event) => setLessonForm((current) => ({ ...current, title: event.target.value }))}
                  placeholder="Tên bài học"
                  required
                />
                <input
                  className="rounded border border-indigo/10 bg-washi px-4 py-3 text-sm focus:outline-none"
                  value={lessonForm.description}
                  onChange={(event) => setLessonForm((current) => ({ ...current, description: event.target.value }))}
                  placeholder="Mô tả ngắn"
                />
                <select
                  className="rounded border border-indigo/10 bg-washi px-4 py-3 text-sm focus:outline-none"
                  value={lessonForm.jlpt_level}
                  onChange={(event) => setLessonForm((current) => ({ ...current, jlpt_level: event.target.value }))}
                >
                  {['N5', 'N4', 'N3', 'N2', 'N1'].map((level) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={savingLesson}
                    className="zen-shimmer inline-flex items-center justify-center gap-2 rounded bg-indigo px-4 py-3 text-sm font-semibold text-washi shadow-soft disabled:opacity-60"
                  >
                    {savingLesson ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    {editingLessonId ? 'Lưu' : 'Tạo'}
                  </button>
                  {editingLessonId ? (
                    <button
                      type="button"
                      onClick={resetLessonForm}
                      className="rounded border border-indigo/10 px-4 py-3 text-sm font-semibold text-indigo"
                    >
                      Hủy
                    </button>
                  ) : null}
                </div>
              </form>
            </section>

            {selectedLesson ? (
              <>
                <section className="zen-glass p-4">
                  <div className="mb-3 flex flex-wrap gap-2">
                    {[
                      { id: 'content', label: 'Nội dung', icon: BookOpenText },
                      { id: 'exercises', label: 'Bài tập', icon: Layers3 },
                    ].map((tab) => {
                      const Icon = tab.icon;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setActivePanel(tab.id)}
                          className={`inline-flex items-center gap-2 rounded px-4 py-2 text-sm font-semibold ${
                            activePanel === tab.id
                              ? 'bg-indigo text-washi'
                              : 'bg-washi text-indigo'
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                          {tab.label}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-sm text-ink/70">
                    Đang quản lý: <span className="font-semibold text-indigo">{titleForLesson(selectedLesson)}</span>
                  </p>
                </section>

                {activePanel === 'content' ? (
                  <LessonContentManager
                    lessonId={selectedLesson.id}
                    vocabulary={vocabulary}
                    grammar={grammar}
                    kanji={kanji}
                    onChange={() => loadLessonContent(selectedLesson.id)}
                  />
                ) : null}

                {activePanel === 'exercises' ? (
                  <ExerciseManager
                    lessonId={selectedLesson.id}
                    exercises={exercises}
                    onChange={() => loadLessonContent(selectedLesson.id)}
                  />
                ) : null}
              </>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}

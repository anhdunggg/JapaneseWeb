import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  BookOpenText,
  LoaderCircle,
  Sparkles,
} from 'lucide-react';
import ExerciseManager from '../components/ExerciseManager';
import ExerciseSection from '../components/ExerciseSection';
import QuizPanel from '../components/QuizPanel';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';

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

export default function LessonExercises() {
  const { lessonId } = useParams();
  const { isAdmin } = useAuth();
  const [lesson, setLesson] = useState(null);
  const [vocabulary, setVocabulary] = useState([]);
  const [grammar, setGrammar] = useState([]);
  const [kanji, setKanji] = useState([]);
  const [exercises, setExercises] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
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
      ]);

      if (!mounted) return;

      const firstError =
        lessonResult.error ||
        vocabularyResult.error ||
        grammarResult.error ||
        kanjiResult.error ||
        exercisesResult.error;

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
      setLoading(false);
    }

    loadExercises();

    return () => {
      mounted = false;
    };
  }, [lessonId, refreshKey]);

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
              <ExerciseManager
                lessonId={lessonId}
                exercises={exercises}
                onChange={() => setRefreshKey((current) => current + 1)}
              />
            ) : null}

            <QuizPanel
              lesson={lesson}
              vocabulary={vocabulary}
              grammar={grammar}
              kanji={kanji}
            />

            <ExerciseSection exercises={exercises} />
          </>
        )}
      </div>
    </main>
  );
}

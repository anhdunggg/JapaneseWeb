import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BookOpenText,
  Brain,
  ChevronDown,
  ImageOff,
  Languages,
  LoaderCircle,
  Sparkles,
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import LessonContentManager from '../components/LessonContentManager';
import { useAuth } from '../context/AuthContext';
import { getPlaceholderLabel, isPlaceholderImage } from '../lib/imageUtils';

function pick(item, keys, fallback = '') {
  for (const key of keys) {
    if (item?.[key]) return item[key];
  }

  return fallback;
}

function normalizeExamples(value) {
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
    'Review the lesson material below.',
  );
}

function EmptySection({ label }) {
  return (
    <p className="rounded border border-indigo/10 bg-washi p-4 text-sm text-ink/70">
      No {label} items are visible for this lesson yet.
    </p>
  );
}

function StudyImage({ src, alt, compact = false, positionX = 50, positionY = 50 }) {
  const shouldUseFallback = isPlaceholderImage(src);
  const label = getPlaceholderLabel(src, alt);

  if (shouldUseFallback) {
    return (
      <div
        className={`relative overflow-hidden rounded bg-mist ring-1 ring-indigo/5 ${
          compact ? 'h-20 w-20' : 'h-40 w-full'
        }`}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,183,197,0.5),transparent_32%),radial-gradient(circle_at_80%_80%,rgba(230,126,34,0.22),transparent_34%)]" />
        <div className="absolute inset-x-0 top-0 h-px bg-white/80" />
        <div className="relative flex h-full flex-col items-center justify-center px-4 text-center">
          <p
            className={`font-mincho leading-none text-indigo/80 ${
              compact ? 'text-3xl' : 'text-5xl'
            }`}
          >
            {alt || label}
          </p>
          {!compact && label && label !== alt ? (
            <p className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-vermilion">
              {label}
            </p>
          ) : null}
          {!alt && !label ? <ImageOff className="h-5 w-5 text-ink/45" /> : null}
        </div>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      className={`rounded object-cover ring-1 ring-indigo/5 ${
        compact ? 'h-20 w-20' : 'h-40 w-full'
      }`}
      style={{ objectPosition: `${Number(positionX ?? 50)}% ${Number(positionY ?? 50)}%` }}
    />
  );
}

function ExamplesList({ examples, mode = 'sentence' }) {
  const normalized = normalizeExamples(examples);

  if (normalized.length === 0) return null;

  return (
    <div className="mt-4 space-y-2 border-t border-indigo/10 pt-4">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-vermilion">
        Examples
      </p>
      {normalized.map((example, index) => (
        <div key={`${mode}-${index}`} className="rounded bg-washi p-3">
          <p className="font-mincho text-lg text-indigo">
            {example.japanese || example.word || example.term || 'Example'}
          </p>
          <p className="mt-1 text-sm leading-6 text-ink/75">
            {example.vietnamese || example.meaning || example.english || ''}
          </p>
        </div>
      ))}
    </div>
  );
}

export default function LessonDetail() {
  const { lessonId } = useParams();
  const { isAdmin } = useAuth();
  const [lesson, setLesson] = useState(null);
  const [vocabulary, setVocabulary] = useState([]);
  const [grammar, setGrammar] = useState([]);
  const [kanji, setKanji] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('vocabulary');
  const [showAdminTools, setShowAdminTools] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadLesson() {
      const shouldShowFullLoading =
        !lesson || String(lesson.id) !== String(lessonId);

      if (shouldShowFullLoading) {
        setLoading(true);
      }
      setError('');

      const [lessonResult, vocabularyResult, grammarResult, kanjiResult] =
        await Promise.all([
          supabase.from('lessons').select('*').eq('id', lessonId).single(),
          supabase.from('vocabulary').select('*').eq('lesson_id', lessonId),
          supabase.from('grammar').select('*').eq('lesson_id', lessonId),
          supabase.from('kanji').select('*').eq('lesson_id', lessonId),
        ]);

      if (!mounted) return;

      const firstError =
        lessonResult.error ||
        vocabularyResult.error ||
        grammarResult.error ||
        kanjiResult.error;

      if (firstError) {
        setError(firstError.message);
        setLoading(false);
        return;
      }

      setLesson(lessonResult.data);
      setVocabulary(vocabularyResult.data ?? []);
      setGrammar(grammarResult.data ?? []);
      setKanji(kanjiResult.data ?? []);
      setLoading(false);
    }

    loadLesson();

    return () => {
      mounted = false;
    };
  }, [lessonId, refreshKey]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6 text-indigo">
        <div className="zen-glass flex items-center gap-3 px-5 py-4">
          <LoaderCircle className="h-5 w-5 animate-spin text-vermilion" />
          <span className="text-sm font-medium">Opening lesson...</span>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-5 py-6 text-indigo sm:px-8">
      <div className="mx-auto max-w-6xl">
        <Link
          to="/dashboard"
          className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-vermilion transition hover:text-indigo"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to lessons
        </Link>

        {error ? (
          <div className="flex items-start gap-3 rounded border border-vermilion/20 bg-vermilion/10 p-5 text-sm leading-6">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-vermilion" />
            <p>Could not load this lesson: {error}</p>
          </div>
        ) : (
          <>
            <section className="zen-glass mb-8 p-7">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-vermilion">
                    <BookOpenText className="h-4 w-4" />
                    Lesson
                  </p>
                  <h1 className="font-mincho text-4xl">{titleForLesson(lesson)}</h1>
                  <p className="mt-4 max-w-3xl leading-7 text-ink/75">
                    {detailForLesson(lesson)}
                  </p>
                </div>
                <div className="zen-hover flex h-14 w-14 items-center justify-center rounded bg-sakura/30">
                  <Sparkles className="h-7 w-7 text-vermilion" />
                </div>
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  to={`/lessons/${lessonId}/exercises`}
                  className="zen-shimmer inline-flex items-center gap-2 rounded bg-indigo px-5 py-3 text-sm font-semibold text-washi shadow-soft transition hover:bg-indigo/95"
                >
                  Open exercises
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </section>

            {isAdmin ? (
              <section className="mb-8">
                <button
                  type="button"
                  onClick={() => setShowAdminTools((current) => !current)}
                  className="zen-hover inline-flex items-center gap-2 rounded border border-indigo/10 bg-white/80 px-4 py-3 text-sm font-semibold text-indigo shadow-soft"
                >
                  Admin tools
                  <ChevronDown
                    className={`h-4 w-4 transition ${
                      showAdminTools ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {showAdminTools ? (
                  <div className="mt-4">
                    <LessonContentManager
                      lessonId={lessonId}
                      vocabulary={vocabulary}
                      grammar={grammar}
                      kanji={kanji}
                      onChange={() => setRefreshKey((current) => current + 1)}
                    />
                  </div>
                ) : null}
              </section>
            ) : null}

            <section>
              <div className="mb-6 flex flex-wrap gap-2">
                {[
                  { id: 'vocabulary', label: 'Vocabulary', count: vocabulary.length },
                  { id: 'grammar', label: 'Grammar', count: grammar.length },
                  { id: 'kanji', label: 'Kanji', count: kanji.length },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`rounded px-4 py-3 text-sm font-semibold transition ${
                      activeTab === tab.id
                        ? 'bg-indigo text-washi shadow-soft'
                        : 'bg-white/75 text-indigo ring-1 ring-indigo/10 hover:ring-sakura'
                    }`}
                  >
                    {tab.label}
                    <span className="ml-2 rounded bg-sakura/25 px-2 py-0.5 text-xs">
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>

              {activeTab === 'vocabulary' ? (
                <div className="mb-8">
                  <div className="mb-4 flex items-center justify-between gap-4">
                    <h2 className="flex items-center gap-2 font-mincho text-3xl">
                      <Languages className="h-6 w-6 text-vermilion" />
                      Vocabulary
                    </h2>
                    <span className="text-sm font-semibold text-ink/60">
                      {vocabulary.length} items
                    </span>
                  </div>
                  {vocabulary.length === 0 ? <EmptySection label="vocabulary" /> : null}
                  <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                    {vocabulary.map((item) => {
                      const word = pick(item, ['word', 'term', 'japanese', 'vocab'], 'Word');
                      return (
                        <article key={item.id} className="zen-glass zen-hover p-5">
                          <StudyImage
                            src={item.image_url}
                            alt={word}
                            positionX={item.image_position_x}
                            positionY={item.image_position_y}
                          />
                          <div className="mt-4">
                            <p className="font-mincho text-3xl leading-tight">{word}</p>
                            <div className="mt-2 flex flex-wrap gap-2 text-sm">
                              {item.furigana ? (
                                <span className="rounded bg-sakura/25 px-2 py-1 text-indigo">
                                  {item.furigana}
                                </span>
                              ) : null}
                              {item.romaji ? (
                                <span className="rounded bg-mist px-2 py-1 text-ink/75">
                                  {item.romaji}
                                </span>
                              ) : null}
                            </div>
                            <p className="mt-3 font-semibold text-vermilion">
                              {pick(item, ['meaning', 'english', 'vietnamese', 'definition'])}
                            </p>
                            {item.details ? (
                              <p className="mt-3 text-sm leading-6 text-ink/75">
                                {item.details}
                              </p>
                            ) : null}
                            <ExamplesList examples={item.examples} />
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {activeTab === 'grammar' ? (
                <div className="mb-8">
                  <div className="mb-4 flex items-center justify-between gap-4">
                    <h2 className="flex items-center gap-2 font-mincho text-3xl">
                      <Brain className="h-6 w-6 text-vermilion" />
                      Grammar
                    </h2>
                    <span className="text-sm font-semibold text-ink/60">
                      {grammar.length} points
                    </span>
                  </div>
                  {grammar.length === 0 ? <EmptySection label="grammar" /> : null}
                  <div className="space-y-5">
                    {grammar.map((item) => (
                      <article key={item.id} className="zen-glass zen-hover p-6">
                        <h3 className="font-mincho text-2xl">
                          {pick(item, ['title', 'pattern', 'name'], 'Grammar point')}
                        </h3>
                        {item.structure ? (
                          <p className="mt-3 rounded bg-mist px-4 py-3 font-semibold text-indigo">
                            {item.structure}
                          </p>
                        ) : null}
                        <p className="mt-4 whitespace-pre-line text-sm leading-7 text-ink/75">
                          {pick(item, ['explanation', 'meaning', 'description', 'usage'])}
                        </p>
                        {item.example_japanese || item.example_vietnamese ? (
                          <div className="mt-4 rounded border border-sakura/40 bg-sakura/10 p-4">
                            <p className="font-mincho text-xl">{item.example_japanese}</p>
                            <p className="mt-1 text-sm text-ink/75">
                              {item.example_vietnamese}
                            </p>
                          </div>
                        ) : null}
                        <ExamplesList examples={item.examples} />
                      </article>
                    ))}
                  </div>
                </div>
              ) : null}

              {activeTab === 'kanji' ? (
                <div>
                  <div className="mb-4 flex items-center justify-between gap-4">
                    <h2 className="flex items-center gap-2 font-mincho text-3xl">
                      <BookOpenText className="h-6 w-6 text-vermilion" />
                      Kanji
                    </h2>
                    <span className="text-sm font-semibold text-ink/60">
                      {kanji.length} characters
                    </span>
                  </div>
                  {kanji.length === 0 ? <EmptySection label="kanji" /> : null}
                  <div className="grid gap-5 md:grid-cols-2">
                    {kanji.map((item) => {
                      const character = pick(item, ['character', 'kanji', 'symbol'], 'Kanji');
                      return (
                        <article key={item.id} className="zen-glass zen-hover p-5">
                          <div className="flex gap-4">
                            <StudyImage
                              src={item.image_url}
                              alt={character}
                              compact
                              positionX={item.image_position_x}
                              positionY={item.image_position_y}
                            />
                            <div className="min-w-0">
                              <p className="font-mincho text-5xl leading-none">
                                {character}
                              </p>
                              <p className="mt-2 font-semibold text-vermilion">
                                {item.meaning}
                              </p>
                            </div>
                          </div>
                          <div className="mt-4 grid gap-3 sm:grid-cols-2">
                            {item.onyomi ? (
                              <p className="rounded bg-mist p-3 text-sm">
                                <span className="font-semibold text-indigo">Onyomi: </span>
                                {item.onyomi}
                              </p>
                            ) : null}
                            {item.kunyomi ? (
                              <p className="rounded bg-mist p-3 text-sm">
                                <span className="font-semibold text-indigo">Kunyomi: </span>
                                {item.kunyomi}
                              </p>
                            ) : null}
                          </div>
                          {item.mnemonic ? (
                            <p className="mt-4 text-sm leading-6 text-ink/75">
                              {item.mnemonic}
                            </p>
                          ) : null}
                          <ExamplesList examples={item.examples} mode="kanji" />
                        </article>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </section>
          </>
        )}
      </div>
    </main>
  );
}

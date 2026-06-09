import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, BookOpenText, Brain, Languages, LoaderCircle, Search } from 'lucide-react';
import { supabase } from '../supabaseClient';

function includes(value, query) {
  return String(value ?? '').toLowerCase().includes(query);
}

function lessonTitle(lesson) {
  return lesson.title || lesson.name || lesson.lesson_title || 'Bài học';
}

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [lessons, setLessons] = useState([]);
  const [vocabulary, setVocabulary] = useState([]);
  const [grammar, setGrammar] = useState([]);
  const [kanji, setKanji] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    async function loadSearchData() {
      setLoading(true);
      const [lessonResult, vocabularyResult, grammarResult, kanjiResult] = await Promise.all([
        supabase.from('lessons').select('*'),
        supabase.from('vocabulary').select('*'),
        supabase.from('grammar').select('*'),
        supabase.from('kanji').select('*'),
      ]);

      if (!mounted) return;
      const firstError = lessonResult.error || vocabularyResult.error || grammarResult.error || kanjiResult.error;
      if (firstError) {
        setError(firstError.message);
        setLoading(false);
        return;
      }

      setLessons(lessonResult.data ?? []);
      setVocabulary(vocabularyResult.data ?? []);
      setGrammar(grammarResult.data ?? []);
      setKanji(kanjiResult.data ?? []);
      setLoading(false);
    }

    loadSearchData();
    return () => {
      mounted = false;
    };
  }, []);

  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return [];

    const lessonItems = lessons
      .filter((item) => includes(lessonTitle(item), normalized) || includes(item.description, normalized))
      .map((item) => ({
        id: `lesson:${item.id}`,
        type: 'Bài học',
        icon: BookOpenText,
        title: lessonTitle(item),
        detail: item.description || item.jlpt_level || '',
        href: `/lessons/${item.id}`,
      }));

    const vocabularyItems = vocabulary
      .filter((item) =>
        [item.word, item.furigana, item.romaji, item.meaning, item.details].some((value) => includes(value, normalized)),
      )
      .map((item) => ({
        id: `vocabulary:${item.id}`,
        type: 'Từ vựng',
        icon: Languages,
        title: item.word || item.term || 'Từ vựng',
        detail: [item.meaning, item.furigana, item.romaji].filter(Boolean).join(' · '),
        href: `/lessons/${item.lesson_id}`,
      }));

    const grammarItems = grammar
      .filter((item) =>
        [item.title, item.structure, item.explanation, item.example_japanese, item.example_vietnamese].some((value) =>
          includes(value, normalized),
        ),
      )
      .map((item) => ({
        id: `grammar:${item.id}`,
        type: 'Ngữ pháp',
        icon: Brain,
        title: item.title || item.pattern || 'Ngữ pháp',
        detail: item.structure || item.explanation || '',
        href: `/lessons/${item.lesson_id}`,
      }));

    const kanjiItems = kanji
      .filter((item) =>
        [item.character, item.onyomi, item.kunyomi, item.meaning, item.mnemonic].some((value) => includes(value, normalized)),
      )
      .map((item) => ({
        id: `kanji:${item.id}`,
        type: 'Kanji',
        icon: BookOpenText,
        title: item.character || 'Kanji',
        detail: [item.meaning, item.onyomi, item.kunyomi].filter(Boolean).join(' · '),
        href: `/lessons/${item.lesson_id}`,
      }));

    return [...lessonItems, ...vocabularyItems, ...grammarItems, ...kanjiItems].slice(0, 80);
  }, [grammar, kanji, lessons, query, vocabulary]);

  return (
    <main className="min-h-screen px-5 py-6 text-indigo sm:px-8">
      <div className="mx-auto max-w-5xl">
        <section className="zen-glass mb-6 p-7">
          <p className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-vermilion">
            <Search className="h-4 w-4" />
            Tìm kiếm
          </p>
          <h1 className="font-mincho text-4xl">Tìm nội dung học</h1>
          <label className="mt-6 flex items-center gap-3 rounded border border-indigo/10 bg-washi px-4 py-3">
            <Search className="h-5 w-5 text-vermilion" />
            <input
              autoFocus
              className="w-full bg-transparent text-sm text-indigo placeholder:text-ink/40 focus:outline-none"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tìm từ vựng, kanji, ngữ pháp, lesson..."
            />
          </label>
        </section>

        {loading ? (
          <div className="zen-glass flex items-center gap-3 p-5 text-sm">
            <LoaderCircle className="h-5 w-5 animate-spin text-vermilion" />
            Đang tải dữ liệu tìm kiếm...
          </div>
        ) : null}

        {error ? (
          <div className="mb-5 flex items-start gap-3 rounded border border-vermilion/20 bg-vermilion/10 p-5 text-sm">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-vermilion" />
            <p>{error}</p>
          </div>
        ) : null}

        {!loading && query.trim() && results.length === 0 ? (
          <div className="zen-glass p-5 text-sm text-ink/70">Không tìm thấy nội dung phù hợp.</div>
        ) : null}

        <div className="space-y-3">
          {results.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.id} to={item.href} className="zen-glass zen-hover flex items-start gap-4 p-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded bg-sakura/25 text-vermilion">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-vermilion">{item.type}</span>
                  <span className="mt-1 block font-mincho text-2xl text-indigo">{item.title}</span>
                  <span className="mt-1 block truncate text-sm text-ink/65">{item.detail}</span>
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}

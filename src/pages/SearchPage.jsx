import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { AlertCircle, BookOpenText, Brain, Languages, Pen, Search } from 'lucide-react';
import { supabase } from '../supabaseClient';

function includes(value, query) {
  return String(value ?? '').toLowerCase().includes(query);
}

function lessonTitle(lesson) {
  return lesson.title || lesson.name || lesson.lesson_title || 'Bài học';
}

function SearchSkeleton() {
  return (
    <div className="space-y-6">
      {[0, 1, 2].map((group) => (
        <section key={group} className="zen-glass p-4 sm:p-5">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div className="flex-1">
              <div className="skeleton-line h-3 w-20" />
              <div className="skeleton-line mt-3 h-4 w-72 max-w-full" />
            </div>
            <div className="skeleton-line h-7 w-20" />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {[0, 1, 2, 3].map((item) => (
              <div key={item} className="rounded border border-indigo/10 bg-washi/80 p-4">
                <div className="flex items-start gap-4">
                  <div className="skeleton-line h-11 w-11" />
                  <div className="min-w-0 flex-1">
                    <div className="skeleton-line h-3 w-16" />
                    <div className="skeleton-line mt-3 h-7 w-44 max-w-full" />
                    <div className="skeleton-line mt-3 h-4 w-full" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
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
        icon: Pen,
        title: item.character || 'Kanji',
        detail: [item.meaning, item.onyomi, item.kunyomi].filter(Boolean).join(' · '),
        href: `/lessons/${item.lesson_id}`,
      }));

    return [...lessonItems, ...vocabularyItems, ...grammarItems, ...kanjiItems].slice(0, 80);
  }, [grammar, kanji, lessons, query, vocabulary]);

  const groupedResults = useMemo(
    () =>
      [
        { title: 'Bài học', description: 'Các lesson có tiêu đề hoặc mô tả trùng từ khóa.', items: results.filter((item) => item.type === 'Bài học') },
        { title: 'Từ vựng', description: 'Từ, cách đọc, romaji hoặc nghĩa khớp với nội dung tìm kiếm.', items: results.filter((item) => item.type === 'Từ vựng') },
        { title: 'Kanji', description: 'Chữ Hán, âm đọc, nghĩa hoặc gợi nhớ liên quan.', items: results.filter((item) => item.type === 'Kanji') },
        { title: 'Ngữ pháp', description: 'Mẫu câu, cấu trúc và ví dụ trong kho bài học.', items: results.filter((item) => item.type === 'Ngữ pháp') },
      ].filter((group) => group.items.length > 0),
    [results],
  );

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
          <SearchSkeleton />
        ) : null}

        {error ? (
          <div className="mb-5 flex items-start gap-3 rounded border border-vermilion/20 bg-vermilion/10 p-5 text-sm">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-vermilion" />
            <p>{error}</p>
          </div>
        ) : null}

        {!loading && query.trim() && results.length === 0 ? (
          <div className="zen-glass p-8 text-center">
            <Search className="mx-auto h-10 w-10 text-indigo/20" />
            <p className="mt-4 font-mincho text-2xl text-indigo">Không tìm thấy kết quả</p>
            <p className="mt-2 text-sm text-ink/60">Thử tìm với từ khóa khác.</p>
          </div>
        ) : null}

        {!loading && !query.trim() ? (
          <div className="zen-glass p-8 text-center">
            <div className="pointer-events-none font-mincho text-7xl leading-none text-indigo/10">あ</div>
            <p className="mt-4 font-semibold text-indigo">Nhập từ khóa để tìm kiếm</p>
            <p className="mt-2 text-sm text-ink/55">Gợi ý: <span className="font-semibold text-indigo">あ</span>, <span className="font-semibold text-indigo">N5</span>, <span className="font-semibold text-indigo">こんにちは</span>, <span className="font-semibold text-indigo">xin chào</span></p>
            <div className="mx-auto mt-5 flex flex-wrap justify-center gap-2">
              {['あ', 'N5', 'こんにちは', '勉強', 'kanji'].map((hint) => (
                <button
                  key={hint}
                  type="button"
                  onClick={() => setQuery(hint)}
                  className="zen-hover rounded border border-indigo/10 bg-washi px-3 py-1.5 font-mincho text-sm text-indigo"
                >
                  {hint}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="space-y-6">
          {groupedResults.map((group) => (
            <section key={group.title} className="zen-glass p-4 sm:p-5">
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-vermilion">{group.title}</p>
                  <p className="mt-1 text-sm text-ink/60">{group.description}</p>
                </div>
                <span className="w-fit rounded-full bg-sakura/25 px-3 py-1 text-xs font-semibold text-indigo">
                  {group.items.length} kết quả
                </span>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {group.items.map((item, index) => {
                  const Icon = item.icon;
                  const MotionLink = motion(Link);
                  return (
                    <MotionLink 
                      key={item.id} 
                      to={item.href} 
                      className="zen-hover flex items-start gap-4 rounded border border-indigo/10 bg-washi/80 p-4"
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05, duration: 0.3 }}
                    >
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded bg-sakura/25 text-vermilion">
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className="min-w-0">
                        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-vermilion">{item.type}</span>
                        <span className="mt-1 block truncate font-mincho text-2xl text-indigo">{item.title}</span>
                        <span className="mt-1 block truncate text-sm text-ink/65">{item.detail}</span>
                      </span>
                    </MotionLink>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}

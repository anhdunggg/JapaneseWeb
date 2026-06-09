import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, BookOpenText, CheckCircle2, LoaderCircle, RotateCcw, Trophy } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';

function labelForCard(card) {
  return card.item_type === 'kanji' ? card.character || 'Kanji' : card.word || 'Từ vựng';
}

function meaningForCard(card) {
  if (card.item_type === 'kanji') return [card.meaning, card.onyomi, card.kunyomi].filter(Boolean).join(' · ');
  return [card.meaning, card.furigana, card.romaji].filter(Boolean).join(' · ');
}

function imagePositionFor(item) {
  return `${Number(item?.image_position_x ?? 50)}% ${Number(item?.image_position_y ?? 50)}%`;
}

function KanjiTile({ character }) {
  return (
    <div className="relative mx-auto h-64 w-full max-w-xl overflow-hidden rounded bg-gradient-to-br from-washi via-sakura/20 to-vermilion/20 ring-1 ring-indigo/10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(255,255,255,0.85),transparent_30%),radial-gradient(circle_at_82%_76%,rgba(44,62,80,0.12),transparent_32%)]" />
      <div className="absolute -right-8 -top-12 font-mincho text-[12rem] leading-none text-indigo/[0.04]">
        {character}
      </div>
      <div className="relative flex h-full items-center justify-center">
        <span className="font-mincho text-9xl leading-none text-indigo drop-shadow-sm">{character}</span>
      </div>
    </div>
  );
}

function CompletionScreen({ lessonId, knownCount, weakCount, totalCount, onRestart }) {
  const percent = totalCount ? Math.round((knownCount / totalCount) * 100) : 0;

  return (
    <motion.section
      className="zen-glass p-8 text-center"
      initial={{ opacity: 0, scale: 0.96, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      <div
        className="mx-auto flex h-28 w-28 items-center justify-center rounded-full p-2 shadow-soft"
        style={{
          background: `conic-gradient(#E8A0B0 ${percent * 3.6}deg, rgba(44,62,80,0.1) 0deg)`,
        }}
      >
        <div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-white">
          <span className="font-mincho text-3xl text-indigo">{percent}%</span>
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink/50">Nhớ</span>
        </div>
      </div>

      <h2 className="mt-6 font-mincho text-4xl text-indigo">Hoàn thành phiên học!</h2>
      <p className="mt-3 text-sm text-ink/65">
        Bạn đã ôn qua <span className="font-semibold text-indigo">{totalCount}</span> thẻ
      </p>

      <div className="mx-auto mt-6 grid max-w-xs gap-3 sm:grid-cols-2">
        <div className="flex items-center gap-3 rounded bg-emerald-50 p-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          <div className="text-left">
            <p className="font-mincho text-2xl text-emerald-700">{knownCount}</p>
            <p className="text-xs font-semibold text-emerald-600">Nhớ rồi</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded bg-vermilion/10 p-3">
          <RotateCcw className="h-5 w-5 text-vermilion" />
          <div className="text-left">
            <p className="font-mincho text-2xl text-vermilion">{weakCount}</p>
            <p className="text-xs font-semibold text-vermilion">Cần ôn</p>
          </div>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={onRestart}
          className="zen-shimmer inline-flex items-center gap-2 rounded bg-indigo px-5 py-3 text-sm font-semibold text-washi shadow-soft"
        >
          <RotateCcw className="h-4 w-4" />
          Học lại từ đầu
        </button>
        <Link
          to={`/lessons/${lessonId}`}
          className="inline-flex items-center gap-2 rounded border border-indigo/10 bg-washi px-5 py-3 text-sm font-semibold text-indigo shadow-soft"
        >
          <BookOpenText className="h-4 w-4" />
          Về bài học
        </Link>
        <Link
          to={`/lessons/${lessonId}/exercises`}
          className="inline-flex items-center gap-2 rounded border border-indigo/10 bg-washi px-5 py-3 text-sm font-semibold text-indigo shadow-soft"
        >
          <Trophy className="h-4 w-4" />
          Làm quiz
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </motion.section>
  );
}

export default function StudySession() {
  const { lessonId } = useParams();
  const { user } = useAuth();
  const [lesson, setLesson] = useState(null);
  const [vocabulary, setVocabulary] = useState([]);
  const [kanji, setKanji] = useState([]);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(true);
  const [knownCount, setKnownCount] = useState(0);
  const [weakCount, setWeakCount] = useState(0);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function loadSession() {
      setLoading(true);
      const [lessonResult, vocabularyResult, kanjiResult] = await Promise.all([
        supabase.from('lessons').select('*').eq('id', lessonId).single(),
        supabase.from('vocabulary').select('*').eq('lesson_id', lessonId),
        supabase.from('kanji').select('*').eq('lesson_id', lessonId),
      ]);

      if (!mounted) return;
      setLesson(lessonResult.data);
      setVocabulary((vocabularyResult.data ?? []).map((item) => ({ ...item, item_type: 'vocabulary', item_id: item.id })));
      setKanji((kanjiResult.data ?? []).map((item) => ({ ...item, item_type: 'kanji', item_id: item.id })));
      setLoading(false);
    }

    loadSession();
    return () => {
      mounted = false;
    };
  }, [lessonId]);

  const cards = useMemo(() => [...vocabulary, ...kanji], [kanji, vocabulary]);
  const card = cards[index];
  const progress = cards.length ? Math.round(((index + 1) / cards.length) * 100) : 0;

  function handleRestart() {
    setIndex(0);
    setRevealed(false);
    setFeedback('');
    setKnownCount(0);
    setWeakCount(0);
    setFinished(false);
  }

  async function mark(status) {
    if (!card || !user?.id) return;

    await supabase.from('user_item_reviews').upsert({
      user_id: user.id,
      item_type: card.item_type,
      item_id: card.item_id,
      lesson_id: lessonId,
      status,
      reviewed_at: new Date().toISOString(),
    });

    toast.success(status === 'known' ? 'Đã đánh dấu Nhớ rồi.' : 'Đã đưa vào Ôn hôm nay.');
    if (status === 'known') setKnownCount((c) => c + 1);
    else setWeakCount((c) => c + 1);

    setFeedback(status);
    window.setTimeout(() => {
      setFeedback('');
      setRevealed(false);
      const next = index + 1;
      if (next >= cards.length) {
        setFinished(true);
      } else {
        setIndex(next);
      }
    }, 240);
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6 text-indigo">
        <div className="zen-glass flex items-center gap-3 px-5 py-4">
          <LoaderCircle className="h-5 w-5 animate-spin text-vermilion" />
          <span className="text-sm font-medium">Đang mở study session...</span>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-5 py-6 text-indigo sm:px-8">
      <div className="mx-auto max-w-3xl">
        <section className="zen-glass mb-6 p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-vermilion">Phiên học</p>
          <h1 className="mt-2 font-mincho text-4xl">{lesson?.title || 'Lesson'}</h1>
          <div className="mt-5 h-2 overflow-hidden rounded bg-washi">
            <div
              className="h-full rounded bg-gradient-to-r from-vermilion to-sakura transition-all duration-300"
              style={{ width: finished ? '100%' : `${progress}%` }}
            />
          </div>
          <p className="mt-2 text-sm text-ink/65">
            {finished ? `Hoàn thành ${cards.length}/${cards.length}` : cards.length ? `${index + 1}/${cards.length}` : '0/0'}
          </p>
        </section>

        <AnimatePresence mode="wait">
          {finished ? (
            <CompletionScreen
              key="completion"
              lessonId={lessonId}
              knownCount={knownCount}
              weakCount={weakCount}
              totalCount={cards.length}
              onRestart={handleRestart}
            />
          ) : !card ? (
            <section key="empty" className="zen-glass p-6 text-ink/70">
              Lesson này chưa có từ vựng hoặc kanji để học theo session.
            </section>
          ) : (
            <motion.section
              key={card.item_id}
              className="zen-glass p-6 text-center"
              initial={{ opacity: 0, x: 20 }}
              animate={
                feedback === 'known'
                  ? { scale: [1, 1.025, 1], boxShadow: '0 20px 50px rgba(16, 185, 129, 0.18)' }
                  : feedback === 'weak'
                    ? { x: [0, -8, 8, -4, 0], boxShadow: '0 20px 50px rgba(230, 126, 34, 0.18)' }
                    : { scale: 1, x: 0, opacity: 1 }
              }
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.24 }}
            >
              {card.item_type === 'kanji' ? (
                <KanjiTile character={labelForCard(card)} />
              ) : card.image_url ? (
                <img
                  src={card.image_url}
                  alt={labelForCard(card)}
                  className="mx-auto h-64 w-full max-w-xl rounded object-cover ring-1 ring-indigo/10"
                  style={{ objectPosition: imagePositionFor(card) }}
                />
              ) : null}
              <p className="mt-6 text-xs font-semibold uppercase tracking-[0.16em] text-vermilion">
                {card.item_type === 'kanji' ? 'Kanji' : 'Từ vựng'}
              </p>
              <h2 className="mt-3 font-mincho text-6xl leading-tight">{labelForCard(card)}</h2>
              {revealed ? (
                <div className="mx-auto mt-5 max-w-xl rounded bg-washi p-5 text-left">
                  <p className="font-semibold text-vermilion">{meaningForCard(card)}</p>
                  {card.details || card.mnemonic ? <p className="mt-3 text-sm leading-7 text-ink/75">{card.details || card.mnemonic}</p> : null}
                </div>
              ) : null}

              <div className="mt-6 flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setRevealed((current) => !current)}
                  className="rounded border border-indigo/10 bg-white px-4 py-3 text-sm font-semibold text-indigo"
                >
                  {revealed ? 'Ẩn nghĩa' : 'Hiện nghĩa'}
                </button>
                <button
                  type="button"
                  onClick={() => mark('weak')}
                  className="inline-flex items-center gap-2 rounded bg-vermilion/10 px-4 py-3 text-sm font-semibold text-vermilion"
                >
                  <RotateCcw className="h-4 w-4" />
                  Chưa nhớ
                </button>
                <button
                  type="button"
                  onClick={() => mark('known')}
                  className="inline-flex items-center gap-2 rounded bg-emerald-600 px-4 py-3 text-sm font-semibold text-white"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Nhớ rồi
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRevealed(false);
                    const next = index + 1;
                    if (next >= cards.length) setFinished(true);
                    else setIndex(next);
                  }}
                  className="inline-flex items-center gap-2 rounded bg-indigo px-4 py-3 text-sm font-semibold text-washi"
                >
                  Bỏ qua
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>

              {/* Mini progress dots */}
              {cards.length <= 20 && (
                <div className="mt-6 flex justify-center gap-1.5">
                  {cards.map((_, i) => (
                    <div
                      key={i}
                      className={`h-1.5 w-1.5 rounded-full transition-all ${
                        i < index ? 'bg-emerald-400' : i === index ? 'w-4 bg-vermilion' : 'bg-indigo/15'
                      }`}
                    />
                  ))}
                </div>
              )}
            </motion.section>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}

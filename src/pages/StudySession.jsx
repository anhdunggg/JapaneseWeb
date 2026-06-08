import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle2, LoaderCircle, RotateCcw } from 'lucide-react';
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

export default function StudySession() {
  const { lessonId } = useParams();
  const { user } = useAuth();
  const [lesson, setLesson] = useState(null);
  const [vocabulary, setVocabulary] = useState([]);
  const [kanji, setKanji] = useState([]);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [loading, setLoading] = useState(true);

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
    setRevealed(false);
    setIndex((current) => Math.min(cards.length - 1, current + 1));
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
        <Link to={`/lessons/${lessonId}`} className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-vermilion">
          <ArrowLeft className="h-4 w-4" />
          Về lesson
        </Link>

        <section className="zen-glass mb-6 p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-vermilion">Study Session</p>
          <h1 className="mt-2 font-mincho text-4xl">{lesson?.title || 'Lesson'}</h1>
          <div className="mt-5 h-2 overflow-hidden rounded bg-washi">
            <div className="h-full rounded bg-gradient-to-r from-vermilion to-sakura" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-2 text-sm text-ink/65">{cards.length ? `${index + 1}/${cards.length}` : '0/0'}</p>
        </section>

        {!card ? (
          <section className="zen-glass p-6 text-ink/70">Lesson này chưa có từ vựng hoặc kanji để học theo session.</section>
        ) : (
          <section className="zen-glass p-6 text-center">
            {card.image_url ? (
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
                  setIndex((current) => Math.min(cards.length - 1, current + 1));
                }}
                className="inline-flex items-center gap-2 rounded bg-indigo px-4 py-3 text-sm font-semibold text-washi"
              >
                Bỏ qua
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

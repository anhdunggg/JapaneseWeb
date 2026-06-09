import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Flame, LoaderCircle, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';

function imagePositionFor(item) {
  return `${Number(item?.image_position_x ?? 50)}% ${Number(item?.image_position_y ?? 50)}%`;
}

function labelForItem(item) {
  if (item.item_type === 'kanji') return item.character || 'Kanji';
  return item.word || item.term || item.japanese || 'Từ vựng';
}

function subLabelForItem(item) {
  if (item.item_type === 'kanji') {
    return [item.meaning, item.onyomi, item.kunyomi].filter(Boolean).join(' · ');
  }
  return [item.meaning, item.furigana, item.romaji].filter(Boolean).join(' · ');
}

function KanjiTile({ character }) {
  return (
    <div className="relative flex h-40 items-center justify-center overflow-hidden rounded bg-gradient-to-br from-washi via-sakura/20 to-vermilion/20 ring-1 ring-indigo/10">
      <div className="absolute -right-4 -top-7 font-mincho text-8xl leading-none text-indigo/[0.04]">
        {character}
      </div>
      <span className="relative font-mincho text-7xl leading-none text-indigo drop-shadow-sm">{character}</span>
    </div>
  );
}

export default function TodayReview() {
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [vocabulary, setVocabulary] = useState([]);
  const [kanji, setKanji] = useState([]);
  const [revealed, setRevealed] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadReviewItems() {
    if (!user?.id) return;

    setLoading(true);
    setError('');

    const { data, error: reviewError } = await supabase
      .from('user_item_reviews')
      .select('*')
      .eq('user_id', user.id)
      .order('reviewed_at', { ascending: true });

    if (reviewError) {
      setError(reviewError.message);
      setLoading(false);
      return;
    }

    const rows = data ?? [];
    const vocabularyIds = rows.filter((item) => item.item_type === 'vocabulary').map((item) => item.item_id);
    const kanjiIds = rows.filter((item) => item.item_type === 'kanji').map((item) => item.item_id);

    const [vocabularyResult, kanjiResult] = await Promise.all([
      vocabularyIds.length
        ? supabase.from('vocabulary').select('*').in('id', vocabularyIds)
        : Promise.resolve({ data: [], error: null }),
      kanjiIds.length
        ? supabase.from('kanji').select('*').in('id', kanjiIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    const firstError = vocabularyResult.error || kanjiResult.error;
    if (firstError) {
      setError(firstError.message);
      setLoading(false);
      return;
    }

    setReviews(rows);
    setVocabulary(vocabularyResult.data ?? []);
    setKanji(kanjiResult.data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadReviewItems();
  }, [user?.id]);

  const reviewItems = useMemo(() => {
    const vocabularyById = new Map(vocabulary.map((item) => [item.id, item]));
    const kanjiById = new Map(kanji.map((item) => [item.id, item]));

    return reviews
      .map((review) => {
        const source = review.item_type === 'kanji' ? kanjiById.get(review.item_id) : vocabularyById.get(review.item_id);
        if (!source) return null;
        return { ...source, ...review, review_id: review.id };
      })
      .filter(Boolean)
      .sort((first, second) => {
        if (first.status !== second.status) return first.status === 'weak' ? -1 : 1;
        return new Date(first.reviewed_at || 0) - new Date(second.reviewed_at || 0);
      })
      .slice(0, 24);
  }, [kanji, reviews, vocabulary]);

  async function updateStatus(item, status) {
    setReviews((current) =>
      current.map((review) =>
        review.item_type === item.item_type && review.item_id === item.item_id
          ? { ...review, status, reviewed_at: new Date().toISOString() }
          : review,
      ),
    );

    const { error: updateError } = await supabase.from('user_item_reviews').upsert({
      user_id: user.id,
      item_type: item.item_type,
      item_id: item.item_id,
      lesson_id: item.lesson_id,
      status,
      reviewed_at: new Date().toISOString(),
    });

    if (updateError) {
      toast.error(updateError.message);
      return;
    }

    toast.success(status === 'known' ? 'Đã chuyển sang Nhớ rồi.' : 'Đã giữ trong danh sách cần ôn.');
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6 text-indigo">
        <div className="zen-glass flex items-center gap-3 px-5 py-4">
          <LoaderCircle className="h-5 w-5 animate-spin text-vermilion" />
          <span className="text-sm font-medium">Đang tải mục ôn hôm nay...</span>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-5 py-6 text-indigo sm:px-8">
      <div className="mx-auto max-w-6xl">
        <section className="quest-hero zen-glass mb-8 p-7 text-washi">
          <p className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-sakura">
            <Flame className="h-4 w-4" />
            Ôn tập giãn cách
          </p>
          <h1 className="font-mincho text-4xl">Ôn hôm nay</h1>
          <p className="mt-4 max-w-3xl leading-7 text-washi/80">
            Ưu tiên các mục bạn từng đánh dấu “Chưa nhớ”. Sau khi ôn xong, chuyển sang “Nhớ rồi” để danh sách nhẹ dần.
          </p>
        </section>

        {error ? (
          <div className="mb-5 flex items-start gap-3 rounded border border-vermilion/20 bg-vermilion/10 p-5 text-sm">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-vermilion" />
            <p>{error}</p>
          </div>
        ) : null}

        {reviewItems.length === 0 ? (
          <section className="zen-glass p-6 text-ink/70">
            Chưa có mục nào được đánh dấu để ôn. Vào lesson và bấm “Chưa nhớ” ở từ vựng hoặc kanji để tạo danh sách ôn.
          </section>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {reviewItems.map((item) => {
              const key = `${item.item_type}:${item.item_id}`;
              const isRevealed = revealed[key];
              return (
                <article key={key} className="zen-glass zen-hover p-5">
                  {item.item_type === 'kanji' ? (
                    <KanjiTile character={labelForItem(item)} />
                  ) : item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={labelForItem(item)}
                      className="h-40 w-full rounded object-cover ring-1 ring-indigo/10"
                      style={{ objectPosition: imagePositionFor(item) }}
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-40 items-center justify-center rounded bg-washi font-mincho text-5xl text-indigo">
                      {labelForItem(item)}
                    </div>
                  )}
                  <div className="mt-4 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-vermilion">
                        {item.item_type === 'kanji' ? 'Kanji' : 'Từ vựng'}
                      </p>
                      <h2 className="mt-2 font-mincho text-4xl leading-tight">{labelForItem(item)}</h2>
                    </div>
                    <span
                      className={`rounded px-2 py-1 text-xs font-semibold ${
                        item.status === 'weak' ? 'bg-vermilion/10 text-vermilion' : 'bg-emerald-50 text-emerald-700'
                      }`}
                    >
                      {item.status === 'weak' ? 'Cần ôn' : 'Đã nhớ'}
                    </span>
                  </div>

                  {isRevealed ? (
                    <div className="mt-4 rounded bg-washi p-4 text-sm leading-6 text-ink/75">
                      <p className="font-semibold text-indigo">{subLabelForItem(item)}</p>
                      {item.details || item.mnemonic ? <p className="mt-2">{item.details || item.mnemonic}</p> : null}
                    </div>
                  ) : null}

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setRevealed((current) => ({ ...current, [key]: !current[key] }))}
                      className="rounded border border-indigo/10 bg-white px-3 py-2 text-sm font-semibold text-indigo"
                    >
                      {isRevealed ? 'Ẩn nghĩa' : 'Hiện nghĩa'}
                    </button>
                    <button
                      type="button"
                      onClick={() => updateStatus(item, 'known')}
                      className="inline-flex items-center gap-2 rounded bg-emerald-600 px-3 py-2 text-sm font-semibold text-white"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Nhớ rồi
                    </button>
                    <button
                      type="button"
                      onClick={() => updateStatus(item, 'weak')}
                      className="inline-flex items-center gap-2 rounded bg-vermilion/10 px-3 py-2 text-sm font-semibold text-vermilion"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Ôn lại
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

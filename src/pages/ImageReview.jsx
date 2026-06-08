import { useEffect, useState } from 'react';
import { AlertCircle, ArrowLeft, ImageOff, LoaderCircle, RefreshCw, Save } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { isPlaceholderImage } from '../lib/imageUtils';

export default function ImageReview() {
  const { isAdmin } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState('');
  const [error, setError] = useState('');

  async function loadItems() {
    setLoading(true);
    setError('');
    const { data, error: loadError } = await supabase
      .from('vocabulary')
      .select('id, word, meaning, image_url')
      .order('created_at', { ascending: false })
      .limit(80);

    if (loadError) {
      setError(loadError.message);
      setLoading(false);
      return;
    }

    setItems((data ?? []).map((item) => ({ ...item, draft_url: item.image_url || '' })));
    setLoading(false);
  }

  useEffect(() => {
    if (isAdmin) {
      loadItems();
    }
  }, [isAdmin]);

  async function updateImage(item, imageUrl) {
    setSavingId(item.id);
    const { error: updateError } = await supabase
      .from('vocabulary')
      .update({ image_url: imageUrl })
      .eq('id', item.id);
    setSavingId('');

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setItems((current) =>
      current.map((row) =>
        row.id === item.id ? { ...row, image_url: imageUrl, draft_url: imageUrl } : row,
      ),
    );
  }

  return (
    <main className="min-h-screen px-5 py-6 text-indigo sm:px-8">
      <div className="mx-auto max-w-6xl">
        <Link to="/dashboard" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-vermilion">
          <ArrowLeft className="h-4 w-4" />
          Về trang chủ
        </Link>

        {!isAdmin ? (
          <section className="zen-glass p-7">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-vermilion">
              Chỉ dành cho quản trị viên
            </p>
            <h1 className="mt-2 font-mincho text-3xl">Image review is restricted.</h1>
          </section>
        ) : null}

        {isAdmin ? (
        <>
        <section className="zen-glass mb-6 p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-vermilion">Vocabulary images</p>
              <h1 className="mt-2 font-mincho text-4xl">Duyệt ảnh từ vựng</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-ink/70">
                Kiểm tra ảnh từ vựng gần đây. Dán URL ảnh phù hợp hơn hoặc xóa ảnh sai để thay sau.
              </p>
            </div>
            <button
              type="button"
              onClick={loadItems}
              className="zen-shimmer inline-flex items-center justify-center gap-2 rounded bg-indigo px-4 py-3 text-sm font-semibold text-washi shadow-soft"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </section>

        {error ? (
          <p className="mb-5 flex items-start gap-2 rounded bg-vermilion/10 p-4 text-sm text-indigo">
            <AlertCircle className="h-5 w-5 text-vermilion" />
            {error}
          </p>
        ) : null}

        {loading ? (
          <div className="zen-glass flex items-center gap-3 px-5 py-4">
            <LoaderCircle className="h-5 w-5 animate-spin text-vermilion" />
            Loading images...
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {items.map((item) => (
              <article key={item.id} className="zen-glass zen-hover p-5">
                {item.image_url && !isPlaceholderImage(item.image_url) ? (
                  <img src={item.image_url} alt={item.word} className="h-44 w-full rounded object-cover" loading="lazy" />
                ) : (
                  <div className="flex h-44 items-center justify-center rounded bg-mist">
                    <ImageOff className="h-7 w-7 text-ink/45" />
                  </div>
                )}
                <h2 className="mt-4 font-mincho text-2xl">{item.word}</h2>
                <p className="mt-1 text-sm text-vermilion">{item.meaning}</p>
                <input
                  className="mt-4 w-full rounded border border-indigo/10 bg-washi px-3 py-2 text-xs text-ink focus:outline-none"
                  value={item.draft_url}
                  onChange={(event) =>
                    setItems((current) =>
                      current.map((row) =>
                        row.id === item.id ? { ...row, draft_url: event.target.value } : row,
                      ),
                    )
                  }
                  placeholder="https://..."
                />
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => updateImage(item, item.draft_url)}
                    disabled={savingId === item.id}
                    className="zen-shimmer inline-flex flex-1 items-center justify-center gap-2 rounded bg-indigo px-3 py-2 text-sm font-semibold text-washi disabled:opacity-60"
                  >
                    {savingId === item.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => updateImage(item, '')}
                    className="rounded border border-indigo/10 px-3 py-2 text-sm font-semibold text-indigo"
                  >
                    Clear
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
        </>
        ) : null}
      </div>
    </main>
  );
}

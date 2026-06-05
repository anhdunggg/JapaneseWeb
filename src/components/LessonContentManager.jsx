import { useState } from 'react';
import { LoaderCircle, Pencil, Plus, Trash2 } from 'lucide-react';
import { supabase } from '../supabaseClient';

const emptyForms = {
  vocabulary: {
    word: '',
    furigana: '',
    romaji: '',
    meaning: '',
    details: '',
    image_url: '',
  },
  grammar: {
    title: '',
    structure: '',
    explanation: '',
    example_japanese: '',
    example_vietnamese: '',
  },
  kanji: {
    character: '',
    onyomi: '',
    kunyomi: '',
    meaning: '',
    mnemonic: '',
    image_url: '',
  },
};

function inputClass() {
  return 'rounded border border-indigo/10 bg-washi px-3 py-2 text-sm text-indigo focus:outline-none';
}

function TextInput({ value, onChange, placeholder, required = false }) {
  return (
    <input
      className={inputClass()}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      required={required}
    />
  );
}

function TextArea({ value, onChange, placeholder }) {
  return (
    <textarea
      className={`${inputClass()} min-h-24 resize-y`}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
    />
  );
}

export default function LessonContentManager({
  lessonId,
  vocabulary,
  grammar,
  kanji,
  onChange,
}) {
  const [active, setActive] = useState('vocabulary');
  const [forms, setForms] = useState(emptyForms);
  const [editing, setEditing] = useState({ table: '', id: '' });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const activeForm = forms[active];
  const activeItems = { vocabulary, grammar, kanji }[active];

  function setField(field, value) {
    setForms((current) => ({
      ...current,
      [active]: { ...current[active], [field]: value },
    }));
  }

  function reset(table = active) {
    setForms((current) => ({ ...current, [table]: emptyForms[table] }));
    setEditing({ table: '', id: '' });
  }

  function startEdit(table, item) {
    setActive(table);
    setEditing({ table, id: item.id });
    setForms((current) => ({
      ...current,
      [table]: Object.keys(emptyForms[table]).reduce(
        (next, key) => ({ ...next, [key]: item[key] || '' }),
        {},
      ),
    }));
  }

  async function saveItem(event) {
    event.preventDefault();
    setSaving(true);
    setMessage('');

    const payload = { ...activeForm, lesson_id: lessonId };
    const result =
      editing.table === active && editing.id
        ? await supabase.from(active).update(payload).eq('id', editing.id)
        : await supabase.from(active).insert(payload);

    setSaving(false);

    if (result.error) {
      setMessage(result.error.message);
      return;
    }

    reset(active);
    onChange();
  }

  async function deleteItem(table, item) {
    const label = item.word || item.title || item.character || 'item';
    if (!window.confirm(`Delete "${label}"?`)) return;

    setMessage('');
    const { error } = await supabase.from(table).delete().eq('id', item.id);

    if (error) {
      setMessage(error.message);
      return;
    }

    onChange();
  }

  return (
    <section className="zen-glass mb-8 p-6">
      <div className="mb-5">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-vermilion">
          Lesson content CRUD
        </p>
        <h2 className="mt-2 font-mincho text-3xl">Manage Study Material</h2>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {['vocabulary', 'grammar', 'kanji'].map((table) => (
          <button
            key={table}
            type="button"
            onClick={() => {
              setActive(table);
              reset(table);
            }}
            className={`zen-hover rounded px-4 py-2 text-sm font-semibold capitalize ${
              active === table ? 'bg-indigo text-washi' : 'bg-washi text-indigo'
            }`}
          >
            {table}
          </button>
        ))}
      </div>

      {message ? <p className="mb-4 rounded bg-sakura/20 px-4 py-3 text-sm text-indigo">{message}</p> : null}

      <form onSubmit={saveItem} className="mb-6 grid gap-3">
        {active === 'vocabulary' ? (
          <>
            <div className="grid gap-3 md:grid-cols-4">
              <TextInput value={activeForm.word} onChange={(value) => setField('word', value)} placeholder="Word" required />
              <TextInput value={activeForm.furigana} onChange={(value) => setField('furigana', value)} placeholder="Furigana" />
              <TextInput value={activeForm.romaji} onChange={(value) => setField('romaji', value)} placeholder="Romaji" />
              <TextInput value={activeForm.meaning} onChange={(value) => setField('meaning', value)} placeholder="Meaning" required />
            </div>
            <TextInput value={activeForm.image_url} onChange={(value) => setField('image_url', value)} placeholder="Image URL" />
            <TextArea value={activeForm.details} onChange={(value) => setField('details', value)} placeholder="Details" />
          </>
        ) : null}

        {active === 'grammar' ? (
          <>
            <TextInput value={activeForm.title} onChange={(value) => setField('title', value)} placeholder="Grammar title" required />
            <TextInput value={activeForm.structure} onChange={(value) => setField('structure', value)} placeholder="Structure" />
            <TextArea value={activeForm.explanation} onChange={(value) => setField('explanation', value)} placeholder="Explanation" />
            <div className="grid gap-3 md:grid-cols-2">
              <TextInput value={activeForm.example_japanese} onChange={(value) => setField('example_japanese', value)} placeholder="Example Japanese" />
              <TextInput value={activeForm.example_vietnamese} onChange={(value) => setField('example_vietnamese', value)} placeholder="Example Vietnamese" />
            </div>
          </>
        ) : null}

        {active === 'kanji' ? (
          <>
            <div className="grid gap-3 md:grid-cols-4">
              <TextInput value={activeForm.character} onChange={(value) => setField('character', value)} placeholder="Kanji" required />
              <TextInput value={activeForm.onyomi} onChange={(value) => setField('onyomi', value)} placeholder="Onyomi" />
              <TextInput value={activeForm.kunyomi} onChange={(value) => setField('kunyomi', value)} placeholder="Kunyomi" />
              <TextInput value={activeForm.meaning} onChange={(value) => setField('meaning', value)} placeholder="Meaning" required />
            </div>
            <TextInput value={activeForm.image_url} onChange={(value) => setField('image_url', value)} placeholder="Image URL" />
            <TextArea value={activeForm.mnemonic} onChange={(value) => setField('mnemonic', value)} placeholder="Mnemonic" />
          </>
        ) : null}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={saving}
            className="zen-shimmer inline-flex items-center justify-center gap-2 rounded bg-indigo px-4 py-3 text-sm font-semibold text-washi shadow-soft disabled:opacity-60"
          >
            {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {editing.table === active && editing.id ? 'Save changes' : 'Add item'}
          </button>
          {editing.id ? (
            <button
              type="button"
              onClick={() => reset(active)}
              className="rounded border border-indigo/10 px-4 py-3 text-sm font-semibold text-indigo"
            >
              Cancel
            </button>
          ) : null}
        </div>
      </form>

      <div className="max-h-80 overflow-auto rounded border border-indigo/10">
        {activeItems.length === 0 ? (
          <p className="p-4 text-sm text-ink/70">No items yet.</p>
        ) : (
          activeItems.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-4 border-b border-indigo/10 p-3 last:border-b-0">
              <div className="min-w-0">
                <p className="truncate font-semibold text-indigo">
                  {item.word || item.title || item.character}
                </p>
                <p className="truncate text-sm text-ink/65">
                  {item.meaning || item.structure || item.explanation}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() => startEdit(active, item)}
                  className="rounded border border-indigo/10 p-2 text-indigo"
                  aria-label="Edit item"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => deleteItem(active, item)}
                  className="rounded border border-vermilion/20 p-2 text-vermilion"
                  aria-label="Delete item"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { LoaderCircle, Pencil, Plus, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../supabaseClient';

const emptyForms = {
  vocabulary: {
    word: '',
    furigana: '',
    romaji: '',
    meaning: '',
    details: '',
    image_url: '',
    image_position_x: 50,
    image_position_y: 50,
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
    image_position_x: 50,
    image_position_y: 50,
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

function parseCsv(text) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map((header) => header.trim());
  return lines.slice(1).map((line) => {
    const values = line.split(',').map((value) => value.trim());
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']));
  });
}

export default function LessonContentManager({
  lessonId,
  vocabulary,
  grammar,
  kanji,
  onChange,
}) {
  const [active, setActive] = useState('vocabulary');
  const [editorTable, setEditorTable] = useState('vocabulary');
  const [forms, setForms] = useState(emptyForms);
  const [showEditor, setShowEditor] = useState(false);
  const [editing, setEditing] = useState({ table: '', id: '' });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [importText, setImportText] = useState('');

  const activeItems = { vocabulary, grammar, kanji }[active];
  const editorForm = forms[editorTable];
  const editorItems = { vocabulary, grammar, kanji }[editorTable];
  const isEditing = editing.table === editorTable && editing.id;

  function setField(field, value) {
    setForms((current) => ({
      ...current,
      [editorTable]: { ...current[editorTable], [field]: value },
    }));
  }

  function setImageFocus(event) {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((event.clientX - bounds.left) / bounds.width) * 100));
    const y = Math.max(0, Math.min(100, ((event.clientY - bounds.top) / bounds.height) * 100));

    setForms((current) => ({
      ...current,
      [editorTable]: {
        ...current[editorTable],
        image_position_x: Math.round(x),
        image_position_y: Math.round(y),
      },
    }));
  }

  function reset(table = editorTable) {
    setForms((current) => ({ ...current, [table]: emptyForms[table] }));
    setEditing({ table: '', id: '' });
    setShowEditor(false);
  }

  function startCreate() {
    setEditorTable(active);
    setForms((current) => ({ ...current, [active]: emptyForms[active] }));
    setEditing({ table: '', id: '' });
    setMessage('');
    setShowEditor(true);
  }

  function startEdit(table, item) {
    setEditorTable(table);
    setEditing({ table, id: item.id });
    setMessage(`Editing ${item.word || item.title || item.character || 'item'}.`);
    setShowEditor(true);
    setForms((current) => ({
      ...current,
      [table]: Object.keys(emptyForms[table]).reduce(
        (next, key) => ({
          ...next,
          [key]:
            key === 'image_position_x' || key === 'image_position_y'
              ? item[key] ?? 50
              : item[key] || '',
        }),
        {},
      ),
    }));
  }

  async function saveItem(event) {
    event.preventDefault();
    setSaving(true);
    setMessage('');

    const payload = { ...editorForm, lesson_id: lessonId };
    const result =
      editing.table === editorTable && editing.id
        ? await supabase.from(editorTable).update(payload).eq('id', editing.id)
        : await supabase.from(editorTable).insert(payload);

    setSaving(false);

    if (result.error) {
      setMessage(result.error.message);
      toast.error(result.error.message);
      return;
    }

    toast.success(isEditing ? 'Đã lưu thay đổi.' : 'Đã thêm nội dung.');
    reset(editorTable);
    onChange();
  }

  async function deleteItem(table, item) {
    const label = item.word || item.title || item.character || 'item';
    if (!window.confirm(`Delete "${label}"?`)) return;

    setMessage('');
    const { error } = await supabase.from(table).delete().eq('id', item.id);

    if (error) {
      setMessage(error.message);
      toast.error(error.message);
      return;
    }

    toast.success('Đã xóa nội dung.');
    onChange();
  }

  async function importItems() {
    let rows;
    try {
      rows = importText.trim().startsWith('[') ? JSON.parse(importText) : parseCsv(importText);
    } catch {
      toast.error('Dữ liệu import không hợp lệ.');
      return;
    }

    if (!Array.isArray(rows) || rows.length === 0) {
      toast.error('Dữ liệu import phải là JSON array hoặc CSV có header.');
      return;
    }

    const allowedKeys = Object.keys(emptyForms[active]);
    const payload = rows.map((row) => ({
      ...Object.fromEntries(allowedKeys.map((key) => [key, row[key] ?? emptyForms[active][key]])),
      lesson_id: lessonId,
    }));

    const { error } = await supabase.from(active).insert(payload);
    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success(`Đã import ${payload.length} mục.`);
    setImportText('');
    onChange();
  }

  function renderFields(form) {
    return (
      <>
        {editorTable === 'vocabulary' ? (
          <>
            <div className="grid gap-3 md:grid-cols-4">
              <TextInput value={form.word} onChange={(value) => setField('word', value)} placeholder="Word" required />
              <TextInput value={form.furigana} onChange={(value) => setField('furigana', value)} placeholder="Furigana" />
              <TextInput value={form.romaji} onChange={(value) => setField('romaji', value)} placeholder="Romaji" />
              <TextInput value={form.meaning} onChange={(value) => setField('meaning', value)} placeholder="Meaning" required />
            </div>
            <TextInput value={form.image_url} onChange={(value) => setField('image_url', value)} placeholder="Image URL" />
            <TextArea value={form.details} onChange={(value) => setField('details', value)} placeholder="Details" />
          </>
        ) : null}

        {editorTable === 'grammar' ? (
          <>
            <TextInput value={form.title} onChange={(value) => setField('title', value)} placeholder="Grammar title" required />
            <TextInput value={form.structure} onChange={(value) => setField('structure', value)} placeholder="Structure" />
            <TextArea value={form.explanation} onChange={(value) => setField('explanation', value)} placeholder="Explanation" />
            <div className="grid gap-3 md:grid-cols-2">
              <TextInput value={form.example_japanese} onChange={(value) => setField('example_japanese', value)} placeholder="Example Japanese" />
              <TextInput value={form.example_vietnamese} onChange={(value) => setField('example_vietnamese', value)} placeholder="Example Vietnamese" />
            </div>
          </>
        ) : null}

        {editorTable === 'kanji' ? (
          <>
            <div className="grid gap-3 md:grid-cols-4">
              <TextInput value={form.character} onChange={(value) => setField('character', value)} placeholder="Kanji" required />
              <TextInput value={form.onyomi} onChange={(value) => setField('onyomi', value)} placeholder="Onyomi" />
              <TextInput value={form.kunyomi} onChange={(value) => setField('kunyomi', value)} placeholder="Kunyomi" />
              <TextInput value={form.meaning} onChange={(value) => setField('meaning', value)} placeholder="Meaning" required />
            </div>
            <TextInput value={form.image_url} onChange={(value) => setField('image_url', value)} placeholder="Image URL" />
            <TextArea value={form.mnemonic} onChange={(value) => setField('mnemonic', value)} placeholder="Mnemonic" />
          </>
        ) : null}
      </>
    );
  }

  function renderImagePreview(form) {
    if (!['vocabulary', 'kanji'].includes(editorTable)) return null;

    return (
      <aside className="rounded border border-indigo/10 bg-washi p-3">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-vermilion">
          Image preview
        </p>
        {form.image_url ? (
          <img
            src={form.image_url}
            alt={form.word || form.character || 'Preview'}
            className="h-52 w-full cursor-crosshair rounded object-cover ring-1 ring-indigo/10"
            style={{ objectPosition: imagePositionFor(form) }}
            onPointerDown={setImageFocus}
            onPointerMove={(event) => {
              if (event.buttons === 1) setImageFocus(event);
            }}
          />
        ) : (
          <div className="flex h-52 items-center justify-center rounded bg-white/80 text-sm text-ink/60 ring-1 ring-indigo/10">
            Chưa có URL ảnh
          </div>
        )}
        <p className="mt-3 break-all text-xs leading-5 text-ink/60">
          {form.image_url || 'Paste an image URL to preview it here.'}
        </p>
        {form.image_url ? (
          <>
            <p className="mt-3 text-xs font-semibold text-indigo">
              Drag on the image to choose the visible area.
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <label className="text-xs font-semibold text-ink/70">
                X
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={form.image_position_x ?? 50}
                  onChange={(event) => setField('image_position_x', Number(event.target.value))}
                  className="mt-1 w-full"
                />
              </label>
              <label className="text-xs font-semibold text-ink/70">
                Y
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={form.image_position_y ?? 50}
                  onChange={(event) => setField('image_position_y', Number(event.target.value))}
                  className="mt-1 w-full"
                />
              </label>
            </div>
          </>
        ) : null}
      </aside>
    );
  }

  function labelForItem(item) {
    return item.word || item.title || item.character || 'Item';
  }

  function subLabelForItem(item) {
    return item.meaning || item.structure || item.explanation || '';
  }

  return (
    <section className="zen-glass mb-8 p-6">
      <div className="mb-5">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-vermilion">
          Nội dung bài học
        </p>
        <h2 className="mt-2 font-mincho text-3xl">Quản lý học liệu</h2>
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
              active === table ? 'tab-active' : 'tab-idle'
            }`}
          >
            {table}
          </button>
        ))}
      </div>

      {message && !showEditor ? <p className="mb-4 rounded bg-sakura/20 px-4 py-3 text-sm text-indigo">{message}</p> : null}

      <div className="mb-4 flex justify-end">
        <button
          type="button"
          onClick={startCreate}
          className="zen-shimmer inline-flex items-center justify-center gap-2 rounded bg-indigo px-4 py-3 text-sm font-semibold text-washi shadow-soft"
        >
          <Plus className="h-4 w-4" />
          Add {active}
        </button>
      </div>

      <div className="max-h-80 overflow-auto rounded border border-indigo/10">
        {activeItems.length === 0 ? (
          <p className="p-4 text-sm text-ink/70">Chưa có mục nào.</p>
        ) : (
          activeItems.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-4 border-b border-indigo/10 p-3 last:border-b-0">
              <div className="flex min-w-0 items-center gap-3">
                {['vocabulary', 'kanji'].includes(active) && item.image_url ? (
                  <img
                    src={item.image_url}
                    alt={item.word || item.character || 'Item'}
                    className="h-12 w-12 shrink-0 rounded object-cover ring-1 ring-indigo/10"
                    style={{ objectPosition: imagePositionFor(item) }}
                    loading="lazy"
                  />
                ) : null}
                <div className="min-w-0">
                  <p className="truncate font-semibold text-indigo">
                    {item.word || item.title || item.character}
                  </p>
                  <p className="truncate text-sm text-ink/65">
                    {item.meaning || item.structure || item.explanation}
                  </p>
                </div>
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

      <details className="mt-5 rounded border border-indigo/10 bg-washi p-4">
        <summary className="cursor-pointer text-sm font-semibold text-indigo">
          Import JSON/CSV cho {active}
        </summary>
        <p className="mt-3 text-sm text-ink/65">
          Dán một mảng JSON hoặc CSV có header. Các field hợp lệ sẽ theo tab đang chọn.
        </p>
        <textarea
          className="mt-3 min-h-32 w-full rounded border border-indigo/10 bg-white px-3 py-2 text-sm text-indigo focus:outline-none"
          value={importText}
          onChange={(event) => setImportText(event.target.value)}
          placeholder='[{"word":"私","furigana":"わたし","meaning":"tôi"}]'
        />
        <button
          type="button"
          onClick={importItems}
          className="mt-3 rounded bg-indigo px-4 py-2 text-sm font-semibold text-washi"
        >
          Import
        </button>
      </details>

      <Dialog.Root
        open={showEditor}
        onOpenChange={(open) => {
          if (open) {
            setShowEditor(true);
            return;
          }
          reset(active);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-indigo/20 backdrop-blur-sm" />
          <Dialog.Content className="fixed inset-0 z-50 overflow-auto bg-washi px-5 py-6 text-indigo sm:px-8">
            <div className="mx-auto max-w-7xl">
            <div className="mb-6 flex items-start justify-between gap-4 border-b border-indigo/10 pb-5">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-vermilion">
                  {isEditing ? 'Edit' : 'Add'} {editorTable}
                </p>
                <Dialog.Title className="mt-1 font-mincho text-3xl text-indigo">
                  {editorForm.word || editorForm.title || editorForm.character || (isEditing ? 'Selected item' : 'New item')}
                </Dialog.Title>
                <Dialog.Description className="mt-2 text-sm text-ink/65">
                  The {editorTable} list stays available on the right so you can keep editing without losing context.
                </Dialog.Description>
              </div>
              <Dialog.Close
                className="inline-flex items-center gap-2 rounded border border-indigo/10 bg-white px-4 py-3 text-sm font-semibold text-indigo shadow-soft transition hover:border-sakura"
                aria-label="Close editor"
              >
                Về danh sách
                <X className="h-5 w-5" />
              </Dialog.Close>
            </div>

            {message ? <p className="mb-4 rounded bg-sakura/20 px-4 py-3 text-sm text-indigo">{message}</p> : null}

            <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
              <form onSubmit={saveItem} className="zen-glass grid gap-3 p-6">
                <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
                  <div className="grid gap-3">
                {renderFields(editorForm)}
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="submit"
                        disabled={saving}
                        className="zen-shimmer inline-flex items-center justify-center gap-2 rounded bg-indigo px-4 py-3 text-sm font-semibold text-washi shadow-soft disabled:opacity-60"
                      >
                        {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                        {isEditing ? 'Save changes' : 'Add item'}
                      </button>
                      <button
                        type="button"
                        onClick={() => reset(active)}
                        className="rounded border border-indigo/10 px-4 py-3 text-sm font-semibold text-indigo"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                  {renderImagePreview(editorForm)}
                </div>
              </form>

              <aside className="zen-glass p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold uppercase tracking-[0.14em] text-vermilion">
                    {editorTable} list
                  </p>
                  <span className="rounded bg-sakura/20 px-2 py-1 text-xs font-semibold text-indigo">
                    {editorItems.length}
                  </span>
                </div>
                <div className="max-h-[62vh] overflow-auto rounded border border-indigo/10 bg-white/65">
                  {editorItems.map((item) => {
                    const selected = editing.id === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => startEdit(editorTable, item)}
                        className={`flex w-full items-center gap-3 border-b border-indigo/10 p-3 text-left last:border-b-0 ${
                          selected ? 'bg-sakura/25' : 'hover:bg-washi'
                        }`}
                      >
                        {['vocabulary', 'kanji'].includes(editorTable) && item.image_url ? (
                          <img
                            src={item.image_url}
                            alt={labelForItem(item)}
                            className="h-10 w-10 shrink-0 rounded object-cover ring-1 ring-indigo/10"
                            style={{ objectPosition: imagePositionFor(item) }}
                            loading="lazy"
                          />
                        ) : null}
                        <span className="min-w-0">
                          <span className="block truncate font-semibold text-indigo">
                            {labelForItem(item)}
                          </span>
                          <span className="block truncate text-sm text-ink/65">
                            {subLabelForItem(item)}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </aside>
            </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </section>
  );
}

function imagePositionFor(item) {
  return `${Number(item?.image_position_x ?? 50)}% ${Number(item?.image_position_y ?? 50)}%`;
}

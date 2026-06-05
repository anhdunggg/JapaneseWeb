import { useState } from 'react';
import { LoaderCircle, Pencil, Plus, Trash2 } from 'lucide-react';
import { supabase } from '../supabaseClient';

const emptyForm = {
  type: 'reading',
  title: '',
  instructions: '',
  content: '',
  audio_url: '',
  questionsText: '[\n  {\n    "id": "q1",\n    "prompt": "",\n    "choices": []\n  }\n]',
  answerKeyText: '{\n  "q1": ""\n}',
};

function fieldClass() {
  return 'rounded border border-indigo/10 bg-washi px-3 py-2 text-sm text-indigo focus:outline-none';
}

export default function ExerciseManager({ lessonId, exercises, onChange }) {
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function reset() {
    setForm(emptyForm);
    setEditingId('');
  }

  function startEdit(exercise) {
    setEditingId(exercise.id);
    setForm({
      type: exercise.type || 'reading',
      title: exercise.title || '',
      instructions: exercise.instructions || '',
      content: exercise.content || '',
      audio_url: exercise.audio_url || '',
      questionsText: JSON.stringify(exercise.questions || [], null, 2),
      answerKeyText: JSON.stringify(exercise.answer_key || {}, null, 2),
    });
  }

  async function saveExercise(event) {
    event.preventDefault();
    setSaving(true);
    setMessage('');

    let questions;
    let answerKey;
    try {
      questions = JSON.parse(form.questionsText || '[]');
      answerKey = JSON.parse(form.answerKeyText || '{}');
    } catch {
      setSaving(false);
      setMessage('Questions and answer key must be valid JSON.');
      return;
    }

    const payload = {
      lesson_id: lessonId,
      type: form.type,
      title: form.title.trim(),
      instructions: form.instructions.trim(),
      content: form.content.trim(),
      audio_url: form.audio_url.trim() || null,
      questions,
      answer_key: answerKey,
    };

    const result = editingId
      ? await supabase.from('lesson_exercises').update(payload).eq('id', editingId)
      : await supabase.from('lesson_exercises').insert(payload);

    setSaving(false);

    if (result.error) {
      setMessage(result.error.message);
      return;
    }

    reset();
    onChange();
  }

  async function deleteExercise(exercise) {
    if (!window.confirm(`Delete "${exercise.title}"?`)) return;
    const { error } = await supabase.from('lesson_exercises').delete().eq('id', exercise.id);
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
          Exercise management
        </p>
        <h2 className="mt-2 font-mincho text-3xl">{editingId ? 'Edit Exercise' : 'Add Exercise'}</h2>
      </div>

      {message ? <p className="mb-4 rounded bg-sakura/20 px-4 py-3 text-sm text-indigo">{message}</p> : null}

      <form onSubmit={saveExercise} className="grid gap-3">
        <div className="grid gap-3 md:grid-cols-[160px_1fr]">
          <select className={fieldClass()} value={form.type} onChange={(event) => updateField('type', event.target.value)}>
            <option value="reading">Reading</option>
            <option value="listening">Listening</option>
            <option value="practice">Practice</option>
          </select>
          <input className={fieldClass()} value={form.title} onChange={(event) => updateField('title', event.target.value)} placeholder="Exercise title" required />
        </div>
        <input className={fieldClass()} value={form.instructions} onChange={(event) => updateField('instructions', event.target.value)} placeholder="Instructions" />
        <input className={fieldClass()} value={form.audio_url} onChange={(event) => updateField('audio_url', event.target.value)} placeholder="Audio URL for listening exercises" />
        <textarea className={`${fieldClass()} min-h-32`} value={form.content} onChange={(event) => updateField('content', event.target.value)} placeholder="Reading passage, listening transcript, or practice content" />
        <div className="grid gap-3 lg:grid-cols-2">
          <textarea className={`${fieldClass()} min-h-44 font-mono`} value={form.questionsText} onChange={(event) => updateField('questionsText', event.target.value)} placeholder="Questions JSON" />
          <textarea className={`${fieldClass()} min-h-44 font-mono`} value={form.answerKeyText} onChange={(event) => updateField('answerKeyText', event.target.value)} placeholder="Answer key JSON" />
        </div>
        <div className="flex gap-2">
          <button type="submit" disabled={saving} className="zen-shimmer inline-flex items-center justify-center gap-2 rounded bg-indigo px-4 py-3 text-sm font-semibold text-washi shadow-soft disabled:opacity-60">
            {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {editingId ? 'Save exercise' : 'Add exercise'}
          </button>
          {editingId ? (
            <button type="button" onClick={reset} className="rounded border border-indigo/10 px-4 py-3 text-sm font-semibold text-indigo">
              Cancel
            </button>
          ) : null}
        </div>
      </form>

      <div className="mt-6 rounded border border-indigo/10">
        {exercises.length === 0 ? (
          <p className="p-4 text-sm text-ink/70">No exercises yet.</p>
        ) : (
          exercises.map((exercise) => (
            <div key={exercise.id} className="flex items-center justify-between gap-4 border-b border-indigo/10 p-3 last:border-b-0">
              <div>
                <p className="font-semibold text-indigo">{exercise.title}</p>
                <p className="text-sm capitalize text-ink/65">{exercise.type}</p>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => startEdit(exercise)} className="rounded border border-indigo/10 p-2 text-indigo" aria-label="Edit exercise">
                  <Pencil className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => deleteExercise(exercise)} className="rounded border border-vermilion/20 p-2 text-vermilion" aria-label="Delete exercise">
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

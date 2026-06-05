import { useMemo, useState } from 'react';
import {
  BookOpenText,
  CheckCircle2,
  Eye,
  EyeOff,
  Headphones,
  LoaderCircle,
  PenLine,
  Save,
  Volume2,
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';

function normalizeAnswer(value) {
  return String(value ?? '').trim().toLowerCase();
}

function parseQuestions(value) {
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

function iconForType(type) {
  if (type === 'listening') return Headphones;
  if (type === 'reading') return BookOpenText;
  return PenLine;
}

export default function ExerciseSection({ exercises, onAttemptSaved }) {
  const { user } = useAuth();
  const [answers, setAnswers] = useState({});
  const [checkedExerciseId, setCheckedExerciseId] = useState('');
  const [visibleTranscripts, setVisibleTranscripts] = useState({});
  const [savingId, setSavingId] = useState('');
  const [message, setMessage] = useState('');
  const [activeType, setActiveType] = useState('all');

  const grouped = useMemo(
    () =>
      exercises.reduce(
        (next, exercise) => ({
          ...next,
          [exercise.type]: [...(next[exercise.type] || []), exercise],
        }),
        {},
      ),
    [exercises],
  );

  const typeTabs = useMemo(
    () => [
      { id: 'all', label: 'All', count: exercises.length },
      { id: 'reading', label: 'Reading', count: grouped.reading?.length || 0 },
      { id: 'listening', label: 'Listening', count: grouped.listening?.length || 0 },
      { id: 'practice', label: 'Practice', count: grouped.practice?.length || 0 },
    ],
    [exercises.length, grouped],
  );

  const visibleTypes =
    activeType === 'all' ? ['reading', 'listening', 'practice'] : [activeType];
  const visibleExerciseCount = visibleTypes.reduce(
    (total, type) => total + (grouped[type]?.length || 0),
    0,
  );

  function answerKeyFor(exercise) {
    return exercise.answer_key && typeof exercise.answer_key === 'object'
      ? exercise.answer_key
      : {};
  }

  function scoreFor(exercise) {
    const questions = parseQuestions(exercise.questions);
    const answerKey = answerKeyFor(exercise);
    return questions.reduce((score, question, index) => {
      const key = question.id || String(index);
      return (
        score +
        (normalizeAnswer(answers[`${exercise.id}:${key}`]) === normalizeAnswer(answerKey[key])
          ? 1
          : 0)
      );
    }, 0);
  }

  async function saveAttempt(exercise) {
    const questions = parseQuestions(exercise.questions);
    const attemptAnswers = Object.fromEntries(
      questions.map((question, index) => {
        const key = question.id || String(index);
        return [key, answers[`${exercise.id}:${key}`] || ''];
      }),
    );

    setSavingId(exercise.id);
    setMessage('');

    const { error } = await supabase.from('exercise_attempts').insert({
      user_id: user.id,
      exercise_id: exercise.id,
      lesson_id: exercise.lesson_id,
      score: scoreFor(exercise),
      total_questions: questions.length,
      answers: attemptAnswers,
    });

    setSavingId('');

    if (error) {
      setMessage(`Could not save exercise attempt: ${error.message}`);
      return;
    }

    setMessage('Exercise attempt saved.');
    onAttemptSaved?.();
  }

  function speakExercise(exercise) {
    if (!window.speechSynthesis) {
      setMessage('Speech playback is not supported in this browser.');
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(exercise.content);
    utterance.lang = 'ja-JP';
    utterance.rate = 0.85;
    window.speechSynthesis.speak(utterance);
  }

  if (exercises.length === 0) {
    return (
      <section className="zen-glass mb-8 p-6">
        <h2 className="font-mincho text-3xl">Exercises</h2>
        <p className="mt-3 text-sm text-ink/70">No exercises have been added for this lesson yet.</p>
      </section>
    );
  }

  return (
    <section className="mb-8">
      <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-vermilion">
            Practice room
          </p>
          <h2 className="mt-2 font-mincho text-3xl">Exercises</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {typeTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveType(tab.id)}
              className={`rounded px-4 py-2.5 text-sm font-semibold transition ${
                activeType === tab.id
                  ? 'bg-indigo text-washi shadow-soft'
                  : 'bg-white/80 text-indigo ring-1 ring-indigo/10 hover:ring-sakura'
              }`}
            >
              {tab.label}
              <span className="ml-2 rounded bg-sakura/25 px-2 py-0.5 text-xs">
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {message ? <p className="mb-4 rounded bg-sakura/20 px-4 py-3 text-sm text-indigo">{message}</p> : null}

      {visibleExerciseCount === 0 ? (
        <p className="zen-glass p-5 text-sm text-ink/70">
          No {activeType === 'all' ? '' : activeType} exercises are available yet.
        </p>
      ) : null}

      <div className="space-y-6">
        {visibleTypes.map((type) =>
          (grouped[type] || []).map((exercise) => {
            const Icon = iconForType(type);
            const questions = parseQuestions(exercise.questions);
            const checked = checkedExerciseId === exercise.id;
            return (
              <article key={exercise.id} className="zen-glass zen-hover p-6">
                <div className="mb-5 flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded bg-sakura/25">
                    <Icon className="h-5 w-5 text-vermilion" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-vermilion">
                      {exercise.type}
                    </p>
                    <h3 className="mt-1 font-mincho text-2xl">{exercise.title}</h3>
                    {exercise.instructions ? (
                      <p className="mt-2 text-sm leading-6 text-ink/70">{exercise.instructions}</p>
                    ) : null}
                  </div>
                </div>

                {exercise.type === 'listening' ? (
                  <div className="mb-5 rounded bg-washi p-4">
                    {exercise.audio_url ? (
                      <audio className="w-full" controls src={exercise.audio_url}>
                        <track kind="captions" />
                      </audio>
                    ) : (
                      <button
                        type="button"
                        onClick={() => speakExercise(exercise)}
                        className="zen-shimmer inline-flex items-center gap-2 rounded bg-indigo px-4 py-3 text-sm font-semibold text-washi shadow-soft"
                      >
                        <Volume2 className="h-4 w-4" />
                        Play listening audio
                      </button>
                    )}
                    {exercise.content ? (
                      <div className="mt-4">
                        <button
                          type="button"
                          onClick={() =>
                            setVisibleTranscripts((current) => ({
                              ...current,
                              [exercise.id]: !current[exercise.id],
                            }))
                          }
                          className="inline-flex items-center gap-2 text-sm font-semibold text-vermilion"
                        >
                          {visibleTranscripts[exercise.id] ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                          {visibleTranscripts[exercise.id] ? 'Hide transcript' : 'Show transcript'}
                        </button>
                        {visibleTranscripts[exercise.id] ? (
                          <div className="mt-3 whitespace-pre-line rounded bg-white/80 p-4 leading-7 text-ink/80">
                            {exercise.content}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                ) : exercise.content ? (
                  <div className="mb-5 whitespace-pre-line rounded bg-washi p-4 leading-7 text-ink/80">
                    {exercise.content}
                  </div>
                ) : null}

                <div className="space-y-4">
                  {questions.map((question, index) => {
                    const key = question.id || String(index);
                    const answerKey = answerKeyFor(exercise);
                    const answerValue = answers[`${exercise.id}:${key}`] || '';
                    const isCorrect =
                      normalizeAnswer(answerValue) === normalizeAnswer(answerKey[key]);

                    return (
                      <div key={key} className="zen-hover rounded border border-indigo/10 bg-white/85 p-4 shadow-soft">
                        <div className="mb-3 flex items-start justify-between gap-4">
                          <p className="font-semibold text-indigo">
                            {index + 1}. {question.prompt}
                          </p>
                          {checked && isCorrect ? <CheckCircle2 className="h-5 w-5 text-vermilion" /> : null}
                        </div>

                        {Array.isArray(question.choices) && question.choices.length > 0 ? (
                          <div className="grid gap-2 sm:grid-cols-2">
                            {question.choices.map((choice) => (
                              <label key={choice} className="flex items-center gap-3 rounded bg-washi px-3 py-2 text-sm">
                                <input
                                  type="radio"
                                  name={`${exercise.id}:${key}`}
                                  value={choice}
                                  checked={answerValue === choice}
                                  onChange={(event) =>
                                    setAnswers((current) => ({
                                      ...current,
                                      [`${exercise.id}:${key}`]: event.target.value,
                                    }))
                                  }
                                />
                                {choice}
                              </label>
                            ))}
                          </div>
                        ) : (
                          <input
                            className="w-full rounded border border-indigo/10 bg-washi px-3 py-2 text-sm focus:outline-none"
                            value={answerValue}
                            onChange={(event) =>
                              setAnswers((current) => ({
                                ...current,
                                [`${exercise.id}:${key}`]: event.target.value,
                              }))
                            }
                            placeholder="Your answer"
                          />
                        )}

                        {checked ? (
                          <p className="mt-3 rounded bg-mist p-3 text-sm text-ink/75">
                            Answer: <span className="font-semibold text-indigo">{answerKey[key]}</span>
                          </p>
                        ) : null}
                      </div>
                    );
                  })}
                </div>

                {questions.length > 0 ? (
                  <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
                    <button
                      type="button"
                      onClick={() => setCheckedExerciseId(exercise.id)}
                      className="zen-shimmer rounded bg-vermilion px-4 py-3 text-sm font-semibold text-white shadow-soft"
                    >
                      Check exercise
                    </button>
                    <button
                      type="button"
                      onClick={() => saveAttempt(exercise)}
                      disabled={savingId === exercise.id || checkedExerciseId !== exercise.id}
                      className="zen-hover inline-flex items-center justify-center gap-2 rounded border border-indigo/10 bg-white px-4 py-3 text-sm font-semibold text-indigo shadow-soft disabled:opacity-60"
                    >
                      {savingId === exercise.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      Save attempt
                    </button>
                    {checked ? (
                      <p className="text-sm font-semibold text-indigo">
                        Score: {scoreFor(exercise)}/{questions.length}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </article>
            );
          }),
        )}
      </div>
    </section>
  );
}

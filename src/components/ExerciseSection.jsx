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
import { toast } from 'sonner';
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

export default function ExerciseSection({ exercises, saveHistory = true, onAttemptSaved }) {
  const { user } = useAuth();
  const [answers, setAnswers] = useState({});
  const [checkedExerciseId, setCheckedExerciseId] = useState('');
  const [visibleTranscripts, setVisibleTranscripts] = useState({});
  const [savingId, setSavingId] = useState('');
  const [message, setMessage] = useState('');
  const [activeType, setActiveType] = useState('all');
  const [playbackRate, setPlaybackRate] = useState(1);

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

  const typeLabels = { all: 'Tất cả', reading: 'Đọc hiểu', listening: 'Nghe hiểu', practice: 'Luyện tập' };

  const typeTabs = useMemo(
    () => [
      { id: 'all', label: 'Tất cả', count: exercises.length },
      { id: 'reading', label: 'Đọc hiểu', count: grouped.reading?.length || 0 },
      { id: 'listening', label: 'Nghe hiểu', count: grouped.listening?.length || 0 },
      { id: 'practice', label: 'Luyện tập', count: grouped.practice?.length || 0 },
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
    if (!saveHistory) {
      setMessage('Chế độ xem thử của quản trị viên: không lưu lịch sử bài tập.');
      toast.info('Chế độ xem thử của quản trị viên: không lưu lịch sử bài tập.');
      return;
    }

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
      setMessage(`Không lưu được kết quả bài tập: ${error.message}`);
      toast.error(`Không lưu được kết quả bài tập: ${error.message}`);
      return;
    }

    await supabase.from('user_lesson_progress').upsert({
      user_id: user.id,
      lesson_id: exercise.lesson_id,
      status: scoreFor(exercise) === questions.length ? 'completed' : 'review',
      last_score: scoreFor(exercise),
      last_total: questions.length,
      last_activity_at: new Date().toISOString(),
      completed_at: scoreFor(exercise) === questions.length ? new Date().toISOString() : null,
    });

    setMessage('Đã lưu kết quả bài tập.');
    toast.success('Đã lưu kết quả bài tập.');
    onAttemptSaved?.();
  }

  function speakExercise(exercise) {
    if (!window.speechSynthesis) {
      setMessage('Speech playback is not supported in this browser.');
      toast.error('Speech playback is not supported in this browser.');
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(exercise.content);
    utterance.lang = 'ja-JP';
    utterance.rate = playbackRate;
    window.speechSynthesis.speak(utterance);
  }

  function replayAudio(exercise) {
    const audio = document.getElementById(`audio-${exercise.id}`);
    if (!audio) {
      speakExercise(exercise);
      return;
    }

    audio.currentTime = 0;
    audio.playbackRate = playbackRate;
    audio.play();
  }

  if (exercises.length === 0) {
    return (
      <section className="zen-glass mb-8 p-6">
        <h2 className="font-mincho text-3xl">Bài tập</h2>
        <p className="mt-3 text-sm text-ink/70">Bài học này chưa có bài tập.</p>
      </section>
    );
  }

  return (
    <section className="mb-8">
      <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-vermilion">
            Phòng luyện tập
          </p>
          <h2 className="mt-2 font-mincho text-3xl">Bài tập</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {typeTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveType(tab.id)}
              className={`rounded px-4 py-2.5 text-sm font-semibold transition ${
                activeType === tab.id
                  ? 'tab-active'
                  : 'tab-idle'
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
          Chưa có bài tập {activeType === 'all' ? '' : activeType}.
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
                      {typeLabels[exercise.type] || exercise.type}
                    </p>
                    <h3 className="mt-1 font-mincho text-2xl">{exercise.title}</h3>
                    {exercise.instructions ? (
                      <p className="mt-2 text-sm leading-6 text-ink/70">{exercise.instructions}</p>
                    ) : null}
                  </div>
                </div>

                {exercise.type === 'listening' ? (
                  <div className="mb-5 rounded bg-washi p-4">
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      {[0.75, 1, 1.25].map((rate) => (
                        <button
                          key={rate}
                          type="button"
                          onClick={() => setPlaybackRate(rate)}
                          className={`rounded px-3 py-1.5 text-xs font-semibold ${
                            playbackRate === rate ? 'bg-indigo text-washi' : 'bg-white text-indigo'
                          }`}
                        >
                          {rate}x
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => replayAudio(exercise)}
                        className="rounded bg-white px-3 py-1.5 text-xs font-semibold text-vermilion"
                      >
                        Phát lại
                      </button>
                    </div>
                    {exercise.audio_url ? (
                      <audio
                        id={`audio-${exercise.id}`}
                        className="w-full"
                        controls
                        src={exercise.audio_url}
                        onLoadedMetadata={(event) => {
                          event.currentTarget.playbackRate = playbackRate;
                        }}
                        onPlay={(event) => {
                          event.currentTarget.playbackRate = playbackRate;
                        }}
                      >
                        <track kind="captions" />
                      </audio>
                    ) : (
                      <button
                        type="button"
                        onClick={() => speakExercise(exercise)}
                        className="zen-shimmer inline-flex items-center gap-2 rounded bg-indigo px-4 py-3 text-sm font-semibold text-washi shadow-soft"
                      >
                        <Volume2 className="h-4 w-4" />
                        Nghe audio
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
                          {visibleTranscripts[exercise.id] ? 'Ẩn transcript' : 'Hiện transcript'}
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
                      <div
                        key={key}
                        className={`zen-hover rounded border p-4 shadow-soft ${
                          checked
                            ? isCorrect
                              ? 'border-emerald-200 bg-emerald-50/80'
                              : 'border-vermilion/25 bg-vermilion/10'
                            : 'border-indigo/10 bg-white/85'
                        }`}
                      >
                        <div className="mb-3 flex items-start justify-between gap-4">
                          <p className="font-semibold text-indigo">
                            {index + 1}. {question.prompt}
                          </p>
                          {checked && isCorrect ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : null}
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
                            placeholder="Nhập câu trả lời"
                          />
                        )}

                        {checked ? (
                          <p className="mt-3 rounded bg-mist p-3 text-sm text-ink/75">
                            Đáp án: <span className="font-semibold text-indigo">{answerKey[key]}</span>
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
                      Kiểm tra bài
                    </button>
                    {saveHistory ? (
                      <button
                        type="button"
                        onClick={() => saveAttempt(exercise)}
                        disabled={savingId === exercise.id || checkedExerciseId !== exercise.id}
                        className="zen-hover inline-flex items-center justify-center gap-2 rounded border border-indigo/10 bg-white px-4 py-3 text-sm font-semibold text-indigo shadow-soft disabled:opacity-60"
                      >
                        {savingId === exercise.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Lưu kết quả
                      </button>
                    ) : checked ? (
                      <p className="rounded bg-washi px-4 py-3 text-sm font-semibold text-ink/70">
                        Admin xem thử: không lưu lịch sử.
                      </p>
                    ) : null}
                    {checked ? (
                      <p className="text-sm font-semibold text-indigo">
                        Điểm: {scoreFor(exercise)}/{questions.length}
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

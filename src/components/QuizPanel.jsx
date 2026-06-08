import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { toast } from 'sonner';
import {
  Bot,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  DatabaseZap,
  LoaderCircle,
  Save,
  Shuffle,
  Trophy,
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { generateQuestionBank } from '../lib/geminiQuiz';

const QUIZ_SIZE = 8;

function normalizeAnswer(value) {
  return String(value ?? '').trim().toLowerCase();
}

function shuffle(items) {
  return [...items].sort(() => Math.random() - 0.5);
}

function normalizeQuestion(question, index) {
  return {
    id: question.id || `${Date.now()}-${index}`,
    type: question.type || 'multiple_choice',
    skill: question.skill || 'mixed',
    prompt: question.prompt || '',
    choices: Array.isArray(question.choices) ? question.choices : [],
    answer: question.answer || '',
    explanation: question.explanation || '',
    source: question.source || '',
  };
}

function getQuizRank(percent) {
  if (percent >= 95) return { label: 'S', text: 'Xuất sắc', tone: 'text-vermilion' };
  if (percent >= 80) return { label: 'A', text: 'Rất tốt', tone: 'text-emerald-600' };
  if (percent >= 60) return { label: 'B', text: 'Ổn, nên ôn thêm', tone: 'text-indigo' };
  return { label: 'C', text: 'Cần luyện lại', tone: 'text-vermilion' };
}

export default function QuizPanel({
  lesson,
  vocabulary,
  grammar,
  kanji,
  saveHistory = true,
  onAttemptSaved,
}) {
  const { user, isAdmin } = useAuth();
  const [questionCount, setQuestionCount] = useState(0);
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [loadingBank, setLoadingBank] = useState(true);
  const [generatingBank, setGeneratingBank] = useState(false);
  const [creatingQuiz, setCreatingQuiz] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const score = useMemo(() => {
    if (!quiz) return 0;
    return quiz.questions.reduce((total, question) => {
      return total + (normalizeAnswer(answers[question.id]) === normalizeAnswer(question.answer) ? 1 : 0);
    }, 0);
  }, [answers, quiz]);

  async function loadQuestionCount() {
    setLoadingBank(true);
    const { count, error } = await supabase
      .from('question_bank')
      .select('id', { count: 'exact', head: true })
      .eq('lesson_id', lesson.id);

    if (error) {
      setMessage(`Could not load question bank: ${error.message}`);
      setLoadingBank(false);
      return;
    }

    setQuestionCount(count ?? 0);
    setLoadingBank(false);
  }

  useEffect(() => {
    if (lesson?.id) loadQuestionCount();
  }, [lesson?.id]);

  async function handleGenerateBank() {
    setGeneratingBank(true);
    setMessage('');

    try {
      const questions = await generateQuestionBank({ lesson, vocabulary, grammar, kanji });
      const rows = questions.map((question) => ({
        lesson_id: lesson.id,
        type: question.type,
        skill: question.skill,
        prompt: question.prompt,
        choices: question.choices,
        answer: question.answer,
        explanation: question.explanation,
        source: question.source,
        difficulty: 'normal',
        created_by_ai: true,
      }));

      const { error } = await supabase.from('question_bank').insert(rows);
      if (error) throw error;

      setMessage(`Added ${rows.length} questions to this lesson bank.`);
      toast.success(`Added ${rows.length} questions to this lesson bank.`);
      await loadQuestionCount();
    } catch (err) {
      setMessage(err.message);
      toast.error(err.message);
    } finally {
      setGeneratingBank(false);
    }
  }

  async function handleCreateQuiz() {
    setCreatingQuiz(true);
    setMessage('');
    setShowResult(false);
    setAnswers({});
    setCurrentIndex(0);

    const { data, error } = await supabase
      .from('question_bank')
      .select('*')
      .eq('lesson_id', lesson.id);

    setCreatingQuiz(false);

    if (error) {
      setMessage(`Could not create quiz: ${error.message}`);
      return;
    }

    const bank = data ?? [];
    if (bank.length === 0) {
      setMessage('No questions are available yet. Ask an admin to generate the question bank first.');
      return;
    }

    const selected = shuffle(bank).slice(0, Math.min(QUIZ_SIZE, bank.length));
    setQuiz({
      title: `${lesson.title || 'Lesson'} Practice`,
      questions: selected.map(normalizeQuestion),
    });
  }

  async function handleSave() {
    if (!quiz) return;
    if (!saveHistory) {
      setMessage('Admin preview mode: quiz history is not saved.');
      toast.info('Admin preview mode: quiz history is not saved.');
      return;
    }

    setSaving(true);
    setMessage('');

    const { error } = await supabase.from('quiz_attempts').insert({
      user_id: user.id,
      lesson_id: lesson.id,
      score,
      total_questions: quiz.questions.length,
      questions: quiz.questions,
      answers,
    });

    setSaving(false);

    if (error) {
      setMessage(`Could not save quiz result: ${error.message}`);
      toast.error(`Could not save quiz result: ${error.message}`);
      return;
    }

    await supabase.from('user_lesson_progress').upsert({
      user_id: user.id,
      lesson_id: lesson.id,
      status: score === quiz.questions.length ? 'completed' : 'review',
      last_score: score,
      last_total: quiz.questions.length,
      last_activity_at: new Date().toISOString(),
      completed_at: score === quiz.questions.length ? new Date().toISOString() : null,
    });

    setMessage('Quiz result saved.');
    toast.success('Quiz result saved.');
    onAttemptSaved?.();
  }

  const currentQuestion = quiz?.questions[currentIndex];
  const currentAnswer = currentQuestion ? answers[currentQuestion.id] || '' : '';
  const currentCorrect =
    currentQuestion &&
    normalizeAnswer(currentAnswer) === normalizeAnswer(currentQuestion.answer);
  const scorePercent = quiz?.questions.length ? Math.round((score / quiz.questions.length) * 100) : 0;
  const quizRank = getQuizRank(scorePercent);

  return (
    <section className="zen-glass mb-8 p-6">
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-vermilion">
            <Bot className="h-4 w-4" />
            Quiz nhanh
          </p>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-ink/70">
            Mỗi lần tạo quiz sẽ lấy ngẫu nhiên câu hỏi đã lưu của bài học.
          </p>
          <p className="mt-2 text-sm font-semibold text-indigo">
            {loadingBank ? 'Đang tải ngân hàng câu hỏi...' : `${questionCount} câu hỏi đã lưu`}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          {isAdmin ? (
            <button
              type="button"
              onClick={handleGenerateBank}
              disabled={generatingBank}
              className="zen-hover inline-flex items-center justify-center gap-2 rounded border border-indigo/10 bg-white px-4 py-3 text-sm font-semibold text-indigo shadow-soft transition hover:border-sakura disabled:opacity-70"
            >
              {generatingBank ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <DatabaseZap className="h-4 w-4" />}
              Tạo ngân hàng bằng AI
            </button>
          ) : null}
          <button
            type="button"
            onClick={handleCreateQuiz}
            disabled={creatingQuiz || loadingBank}
            className="zen-shimmer inline-flex items-center justify-center gap-2 rounded bg-indigo px-4 py-3 text-sm font-semibold text-washi shadow-soft transition hover:bg-indigo/95 disabled:opacity-70"
          >
            {creatingQuiz ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Shuffle className="h-4 w-4" />}
            Tạo quiz ngẫu nhiên
          </button>
        </div>
      </div>

      {message ? <p className="mb-5 rounded bg-sakura/20 px-4 py-3 text-sm text-indigo">{message}</p> : null}

      {quiz && currentQuestion ? (
        <div className="space-y-4">
          <div className="rounded bg-washi p-4">
            <div className="mb-3 flex items-center justify-between gap-4">
              <div>
                <p className="font-mincho text-2xl">{quiz.title}</p>
                <p className="mt-1 text-sm text-ink/70">
                  Câu {currentIndex + 1}/{quiz.questions.length}
                </p>
              </div>
              {showResult ? (
                <p className="rounded bg-sakura/30 px-4 py-2 text-sm font-semibold text-indigo">
                  Điểm: {score}/{quiz.questions.length}
                </p>
              ) : null}
            </div>
            <div className="h-2 overflow-hidden rounded bg-white">
              <div
                className="h-full rounded bg-gradient-to-r from-vermilion to-sakura"
                style={{ width: `${((currentIndex + 1) / quiz.questions.length) * 100}%` }}
              />
            </div>
          </div>

          <article
            className={`quiz-focus-card rounded border p-6 shadow-soft ${
              showResult
                ? currentCorrect
                  ? 'border-emerald-200 bg-emerald-50/80'
                  : 'border-vermilion/25 bg-vermilion/10'
                : 'border-indigo/10 bg-white/85'
            }`}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-vermilion">
                  {currentQuestion.skill} - {currentQuestion.type.replaceAll('_', ' ')}
                </p>
                <h3 className="mt-3 text-xl font-semibold leading-8 text-indigo">
                  {currentIndex + 1}. {currentQuestion.prompt}
                </h3>
              </div>
              {showResult && currentCorrect ? <CheckCircle2 className="h-6 w-6 text-emerald-600" /> : null}
            </div>

            {currentQuestion.choices.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {currentQuestion.choices.map((choice) => (
                  <label
                    key={choice}
                    className={`flex cursor-pointer items-center gap-3 rounded border px-4 py-3 text-sm transition ${
                      currentAnswer === choice
                        ? 'border-vermilion bg-sakura/20'
                        : 'border-indigo/10 bg-washi hover:border-sakura'
                    }`}
                  >
                    <input
                      type="radio"
                      name={currentQuestion.id}
                      value={choice}
                      checked={currentAnswer === choice}
                      onChange={(event) =>
                        setAnswers((current) => ({ ...current, [currentQuestion.id]: event.target.value }))
                      }
                    />
                    {choice}
                  </label>
                ))}
              </div>
            ) : (
              <input
                className="w-full rounded border border-indigo/10 bg-washi px-4 py-3 text-sm focus:outline-none"
                value={currentAnswer}
                onChange={(event) =>
                  setAnswers((current) => ({ ...current, [currentQuestion.id]: event.target.value }))
                }
                placeholder="Nhập câu trả lời"
              />
            )}

            {showResult ? (
              <div className="mt-4 rounded bg-mist p-4 text-sm leading-6 text-ink/75">
                <p>
                  <span className="font-semibold text-indigo">Đáp án:</span> {currentQuestion.answer}
                </p>
                <p>{currentQuestion.explanation}</p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-vermilion">
                  Nguồn: {currentQuestion.source}
                </p>
              </div>
            ) : null}
          </article>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCurrentIndex((index) => Math.max(0, index - 1))}
                disabled={currentIndex === 0}
                className="inline-flex items-center gap-2 rounded border border-indigo/10 bg-white px-4 py-3 text-sm font-semibold text-indigo shadow-soft disabled:opacity-45"
              >
                <ChevronLeft className="h-4 w-4" />
                Trước
              </button>
              <button
                type="button"
                onClick={() => setCurrentIndex((index) => Math.min(quiz.questions.length - 1, index + 1))}
                disabled={currentIndex === quiz.questions.length - 1}
                className="inline-flex items-center gap-2 rounded border border-indigo/10 bg-white px-4 py-3 text-sm font-semibold text-indigo shadow-soft disabled:opacity-45"
              >
                Sau
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => setShowResult(true)}
                className="zen-shimmer rounded bg-vermilion px-4 py-3 text-sm font-semibold text-white shadow-soft"
              >
                Kiểm tra đáp án
              </button>
              {saveHistory ? (
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!showResult || saving}
                  className="zen-hover inline-flex items-center justify-center gap-2 rounded border border-indigo/10 bg-white px-4 py-3 text-sm font-semibold text-indigo shadow-soft disabled:opacity-60"
                >
                  {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Lưu kết quả
                </button>
              ) : showResult ? (
                <p className="rounded bg-washi px-4 py-3 text-sm font-semibold text-ink/70">
                  Admin xem thử: không lưu lịch sử.
                </p>
              ) : null}
            </div>
          </div>

          <AnimatePresence>
            {showResult ? (
              <motion.section
                className="rounded border border-indigo/10 bg-white/85 p-5 shadow-soft"
                initial={{ opacity: 0, y: 16, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.98 }}
                transition={{ duration: 0.28, ease: 'easeOut' }}
              >
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-mincho text-2xl text-indigo">Tổng kết quiz</p>
                  <p className="mt-2 text-sm text-ink/70">
                    Bạn đúng {score}/{quiz.questions.length} câu.
                  </p>
                  <div className="mt-4 inline-flex items-center gap-3 rounded bg-sakura/20 px-4 py-3">
                    <Trophy className="h-5 w-5 text-vermilion" />
                    <span className="text-sm font-semibold text-indigo">
                      Rank <span className={`font-mincho text-2xl ${quizRank.tone}`}>{quizRank.label}</span> - {quizRank.text}
                    </span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handleCreateQuiz}
                      disabled={creatingQuiz}
                      className="zen-shimmer inline-flex items-center gap-2 rounded bg-indigo px-4 py-3 text-sm font-semibold text-washi shadow-soft disabled:opacity-70"
                    >
                      {creatingQuiz ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Shuffle className="h-4 w-4" />}
                      Tạo quiz khác
                    </button>
                    <Link
                      to="/mistakes"
                      className="zen-hover inline-flex items-center gap-2 rounded border border-indigo/10 bg-washi px-4 py-3 text-sm font-semibold text-indigo shadow-soft"
                    >
                      Ôn câu sai
                    </Link>
                  </div>
                </div>
                <div
                  className="flex h-28 w-28 shrink-0 items-center justify-center rounded-full p-2 shadow-soft"
                  style={{
                    background: `conic-gradient(#E67E22 ${scorePercent * 3.6}deg, rgba(44,62,80,0.1) 0deg)`,
                  }}
                >
                  <div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-white">
                    <span className="font-mincho text-3xl text-indigo">{scorePercent}%</span>
                    <span className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/50">Score</span>
                  </div>
                </div>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {quiz.questions
                  .filter((question) => normalizeAnswer(answers[question.id]) !== normalizeAnswer(question.answer))
                  .map((question, index) => (
                    <div key={question.id} className="rounded bg-vermilion/10 p-3 text-sm">
                      <p className="font-semibold text-indigo">{index + 1}. {question.prompt}</p>
                      <p className="mt-2 text-ink/70">Bạn chọn: {answers[question.id] || '-'}</p>
                      <p className="mt-1 text-vermilion">Đáp án: {question.answer}</p>
                    </div>
                  ))}
              </div>
              {score === quiz.questions.length ? (
                <p className="mt-4 rounded bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">
                  Không có câu sai trong quiz này.
                </p>
              ) : null}
              </motion.section>
            ) : null}
          </AnimatePresence>
        </div>
      ) : null}
    </section>
  );
}

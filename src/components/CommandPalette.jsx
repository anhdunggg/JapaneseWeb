import { useEffect, useMemo, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useNavigate } from 'react-router-dom';
import { BookOpenText, Home, Search, Shield, Target, Trophy, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';

export default function CommandPalette({ openSignal = 0 }) {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [lessons, setLessons] = useState([]);

  useEffect(() => {
    function onKeyDown(event) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen((current) => !current);
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (openSignal > 0) setOpen(true);
  }, [openSignal]);

  useEffect(() => {
    if (!open || lessons.length) return;

    supabase
      .from('lessons')
      .select('id,title,name,lesson_title,jlpt_level')
      .then(({ data }) => setLessons(data ?? []));
  }, [lessons.length, open]);

  const commands = useMemo(() => {
    const base = [
      { label: 'Trang chủ', detail: 'Về màn học chính', href: '/dashboard', icon: Home },
      { label: 'Tìm kiếm', detail: 'Tìm nhanh nội dung học', href: '/search', icon: Search },
      { label: 'Ôn hôm nay', detail: 'Mở danh sách cần ôn', href: '/review/today', icon: Target },
      { label: 'Hồ sơ', detail: 'Xem tiến độ học', href: '/profile', icon: Trophy },
    ];

    if (isAdmin) {
      base.push({ label: 'Quản trị', detail: 'Quản lý nội dung học', href: '/admin', icon: Shield });
    }

    const lessonCommands = lessons.map((lesson) => ({
      label: lesson.title || lesson.name || lesson.lesson_title || 'Bài học',
      detail: lesson.jlpt_level || 'Bài học',
      href: `/lessons/${lesson.id}`,
      icon: BookOpenText,
    }));

    const normalized = query.trim().toLowerCase();
    return [...base, ...lessonCommands]
      .filter((item) => !normalized || `${item.label} ${item.detail}`.toLowerCase().includes(normalized))
      .slice(0, 12);
  }, [isAdmin, lessons, query]);

  function runCommand(href) {
    setOpen(false);
    setQuery('');
    navigate(href);
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[70] bg-indigo/25 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-20 z-[80] w-[calc(100vw-2rem)] max-w-2xl -translate-x-1/2 rounded bg-washi p-4 text-indigo shadow-zen ring-1 ring-indigo/10">
          <div className="mb-3 flex items-center justify-between gap-3">
            <Dialog.Title className="font-mincho text-2xl">Mở nhanh</Dialog.Title>
            <Dialog.Close className="rounded border border-indigo/10 bg-white p-2 text-indigo">
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>
          <label className="flex items-center gap-3 rounded border border-indigo/10 bg-white px-4 py-3">
            <Search className="h-4 w-4 text-vermilion" />
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="w-full bg-transparent text-sm focus:outline-none"
              placeholder="Gõ tên trang hoặc bài học..."
            />
            <span className="rounded bg-mist px-2 py-1 text-xs font-semibold text-ink/60">Ctrl K</span>
          </label>
          <div className="mt-3 max-h-[52vh] overflow-auto">
            {commands.map((command) => {
              const Icon = command.icon;
              return (
                <button
                  key={`${command.href}:${command.label}`}
                  type="button"
                  onClick={() => runCommand(command.href)}
                  className="flex w-full items-center gap-3 rounded px-3 py-3 text-left transition hover:bg-white"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded bg-sakura/25 text-vermilion">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-indigo">{command.label}</span>
                    <span className="block truncate text-xs text-ink/60">{command.detail}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

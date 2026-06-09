import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { Command, Home, Moon, Search, Shield, Sun, Target, Trophy } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Breadcrumbs from './Breadcrumbs';
import CommandPalette from './CommandPalette';

function navClass({ isActive }) {
  return `inline-flex items-center gap-2 rounded px-3 py-2 text-sm font-semibold transition ${
    isActive ? 'tab-active' : 'text-indigo hover:bg-white/80'
  }`;
}

function mobileNavClass({ isActive }) {
  return `flex flex-1 flex-col items-center gap-1 rounded px-2 py-2 text-[11px] font-semibold transition ${
    isActive ? 'tab-active' : 'text-ink/65'
  }`;
}

export default function AppShell() {
  const { isAdmin, signOut, user } = useAuth();
  const location = useLocation();
  const [nightMode, setNightMode] = useState(() => localStorage.getItem('theme') === 'night');
  const [commandSignal, setCommandSignal] = useState(0);

  useEffect(() => {
    document.body.classList.toggle('theme-night', nightMode);
    localStorage.setItem('theme', nightMode ? 'night' : 'day');
  }, [nightMode]);

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <header className="sticky top-0 z-40 border-b border-indigo/10 bg-washi/82 px-4 py-3 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <NavLink to="/dashboard" className="flex items-center gap-3 text-indigo">
            <span className="flex h-10 w-10 items-center justify-center rounded bg-vermilion font-mincho text-xl text-white shadow-soft">
              日
            </span>
            <span className="hidden sm:block">
              <span className="block text-xs font-semibold uppercase tracking-[0.16em] text-vermilion">
                Mochi
              </span>
              <span className="block font-mincho text-xl leading-none">Học tiếng Nhật</span>
            </span>
          </NavLink>

          <nav className="hidden items-center gap-1 md:flex">
            <NavLink to="/dashboard" className={navClass}>
              <Home className="h-4 w-4" />
              Trang chủ
            </NavLink>
            <NavLink to="/search" className={navClass}>
              <Search className="h-4 w-4" />
              Tìm kiếm
            </NavLink>
            <NavLink to="/review/today" className={navClass}>
              <Target className="h-4 w-4" />
              Ôn tập
            </NavLink>
            <NavLink to="/profile" className={navClass}>
              <Trophy className="h-4 w-4" />
              Hồ sơ
            </NavLink>
            {isAdmin ? (
              <NavLink to="/admin" className={navClass}>
                <Shield className="h-4 w-4" />
                Quản trị
              </NavLink>
            ) : null}
          </nav>

          <div className="flex items-center gap-2">
            {/* Command Palette */}
            <button
              type="button"
              onClick={() => setCommandSignal((current) => current + 1)}
              aria-label="Mở tìm nhanh (Ctrl K)"
              className="zen-hover flex h-10 w-10 items-center justify-center gap-2 rounded border border-indigo/10 bg-white/80 px-0 text-indigo shadow-soft lg:w-auto lg:px-3"
            >
              <Command className="h-4 w-4" />
              <span className="hidden text-xs font-semibold text-ink/55 lg:block">⌘K</span>
            </button>

            <button
              type="button"
              onClick={() => setNightMode((current) => !current)}
              className="zen-hover inline-flex h-10 w-10 items-center justify-center rounded border border-indigo/10 bg-white/80 text-indigo shadow-soft"
              aria-label="Đổi giao diện sáng/tối"
            >
              {nightMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={signOut}
              className="hidden rounded border border-indigo/10 bg-white/80 px-3 py-2 text-sm font-semibold text-indigo shadow-soft sm:inline-flex"
            >
              Đăng xuất
            </button>
          </div>
        </div>
        {user?.email ? (
          <p className="mx-auto mt-2 max-w-7xl truncate text-xs text-ink/55 sm:hidden">{user.email}</p>
        ) : null}
      </header>
      <Breadcrumbs />

      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
      >
        <Outlet />
      </motion.div>

      {/* Mobile bottom nav — 4 tab gọn, không có Command (đã lên header) */}
      <nav className="fixed inset-x-3 bottom-3 z-50 flex gap-1 rounded bg-white/90 p-2 shadow-zen ring-1 ring-indigo/10 backdrop-blur md:hidden">
        <NavLink to="/dashboard" className={mobileNavClass}>
          <Home className="h-4 w-4" />
          Trang chủ
        </NavLink>
        <NavLink to="/search" className={mobileNavClass}>
          <Search className="h-4 w-4" />
          Tìm kiếm
        </NavLink>
        <NavLink to="/review/today" className={mobileNavClass}>
          <Target className="h-4 w-4" />
          Ôn tập
        </NavLink>
        <NavLink to="/profile" className={mobileNavClass}>
          <Trophy className="h-4 w-4" />
          Hồ sơ
        </NavLink>
      </nav>
      <CommandPalette openSignal={commandSignal} />
    </div>
  );
}

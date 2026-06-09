import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';

const labelMap = {
  admin: 'Quản trị',
  dashboard: 'Trang chủ',
  exercises: 'Bài tập',
  images: 'Ảnh',
  lessons: 'Bài học',
  mistakes: 'Câu sai',
  profile: 'Hồ sơ',
  review: 'Ôn tập',
  search: 'Tìm kiếm',
  study: 'Phiên học',
  today: 'Ôn hôm nay',
};

const UUID_RE = /^[0-9a-f-]{20,}$/i;

function isUuid(value) {
  return UUID_RE.test(value);
}

function staticLabel(part) {
  return labelMap[part] || part;
}

/**
 * Dùng hook nhỏ để fetch tên bài học theo ID từ URL.
 * Chỉ fetch khi path chứa segment UUID sau "lessons/".
 */
function useLessonTitle(parts) {
  const [titleMap, setTitleMap] = useState({});

  useEffect(() => {
    const lessonIndex = parts.indexOf('lessons');
    if (lessonIndex === -1) return;
    const lessonId = parts[lessonIndex + 1];
    if (!lessonId || !isUuid(lessonId)) return;
    if (titleMap[lessonId]) return;

    let mounted = true;
    supabase
      .from('lessons')
      .select('id, title, name, lesson_title')
      .eq('id', lessonId)
      .single()
      .then(({ data }) => {
        if (!mounted || !data) return;
        const name = data.title || data.name || data.lesson_title || 'Chi tiết';
        setTitleMap((prev) => ({ ...prev, [lessonId]: name }));
      });

    return () => {
      mounted = false;
    };
  }, [parts.join('/')]);

  return titleMap;
}

export default function Breadcrumbs() {
  const location = useLocation();
  const parts = location.pathname.split('/').filter(Boolean);

  const titleMap = useLessonTitle(parts);

  if (parts.length === 0 || location.pathname === '/dashboard') return null;

  const crumbs = parts.map((part, index) => ({
    label: isUuid(part) ? (titleMap[part] || '…') : staticLabel(part),
    href: `/${parts.slice(0, index + 1).join('/')}`,
  }));

  return (
    <nav className="mx-auto max-w-7xl px-4 pt-3 text-xs font-semibold text-ink/55" aria-label="Breadcrumb">
      <Link to="/dashboard" className="text-vermilion hover:text-indigo">
        Trang chủ
      </Link>
      {crumbs.map((crumb, index) => (
        <span key={`${crumb.href}:${index}`}>
          <span className="px-2 text-ink/35">/</span>
          {index === crumbs.length - 1 ? (
            <span className="max-w-[200px] truncate text-ink/65">{crumb.label}</span>
          ) : (
            <Link to={crumb.href} className="hover:text-vermilion">
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}

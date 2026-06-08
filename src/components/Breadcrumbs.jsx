import { Link, useLocation } from 'react-router-dom';

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

function labelFor(part) {
  if (/^[0-9a-f-]{20,}$/i.test(part)) return 'Chi tiết';
  return labelMap[part] || part;
}

export default function Breadcrumbs() {
  const location = useLocation();
  const parts = location.pathname.split('/').filter(Boolean);
  if (parts.length === 0 || location.pathname === '/dashboard') return null;

  const crumbs = parts.map((part, index) => ({
    label: labelFor(part),
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
            <span className="text-ink/65">{crumb.label}</span>
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

import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';

const AdminPage = lazy(() => import('./pages/AdminPage'));
const AuthPage = lazy(() => import('./pages/AuthPage'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const ImageReview = lazy(() => import('./pages/ImageReview'));
const LessonDetail = lazy(() => import('./pages/LessonDetail'));
const LessonExercises = lazy(() => import('./pages/LessonExercises'));
const MistakeReview = lazy(() => import('./pages/MistakeReview'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const SearchPage = lazy(() => import('./pages/SearchPage'));
const StudySession = lazy(() => import('./pages/StudySession'));
const TodayReview = lazy(() => import('./pages/TodayReview'));

function RouteFallback() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 text-indigo">
      <div className="flex flex-col items-center">
        <div className="relative mb-4 flex h-20 w-20 items-center justify-center">
          <div className="absolute inset-0 animate-ping rounded-full bg-sakura/20" style={{ animationDuration: '2s' }} />
          <div className="absolute inset-2 animate-pulse rounded-full bg-vermilion/20" />
          <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-washi shadow-soft">
            <span className="font-mincho text-3xl text-vermilion">学</span>
          </div>
        </div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink/50 animate-pulse">
          Đang tải
        </p>
      </div>
    </main>
  );
}

export default function App() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/admin/lessons/:lessonId" element={<AdminPage />} />
          <Route path="/images/review" element={<ImageReview />} />
          <Route path="/mistakes" element={<MistakeReview />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/review/today" element={<TodayReview />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/lessons/:lessonId" element={<LessonDetail />} />
          <Route path="/lessons/:lessonId/exercises" element={<LessonExercises />} />
          <Route path="/lessons/:lessonId/study" element={<StudySession />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

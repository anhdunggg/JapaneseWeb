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

function RouteFallback() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 text-indigo">
      <div className="zen-glass px-5 py-4 text-sm font-semibold">Đang tải trang...</div>
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
          <Route path="/images/review" element={<ImageReview />} />
          <Route path="/mistakes" element={<MistakeReview />} />
          <Route path="/lessons/:lessonId" element={<LessonDetail />} />
          <Route path="/lessons/:lessonId/exercises" element={<LessonExercises />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

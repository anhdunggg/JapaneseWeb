import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import AdminPage from './pages/AdminPage';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import ImageReview from './pages/ImageReview';
import LessonDetail from './pages/LessonDetail';
import LessonExercises from './pages/LessonExercises';

export default function App() {
  return (
    <Routes>
      <Route path="/auth" element={<AuthPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/images/review" element={<ImageReview />} />
        <Route path="/lessons/:lessonId" element={<LessonDetail />} />
        <Route path="/lessons/:lessonId/exercises" element={<LessonExercises />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

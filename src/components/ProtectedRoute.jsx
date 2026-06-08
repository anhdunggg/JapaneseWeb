import { Navigate, useLocation } from 'react-router-dom';
import { LoaderCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import AppShell from './AppShell';

export default function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-washi px-6 text-indigo">
        <div className="zen-glass w-full max-w-sm p-5">
          <div className="mb-4 h-4 w-32 animate-pulse rounded bg-mist" />
          <div className="mb-3 h-10 animate-pulse rounded bg-mist" />
          <div className="mb-5 h-10 w-4/5 animate-pulse rounded bg-mist" />
          <div className="flex items-center gap-3">
          <LoaderCircle className="h-5 w-5 animate-spin text-vermilion" />
          <span className="text-sm font-medium">Đang chuẩn bị không gian học...</span>
          </div>
        </div>
      </main>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace state={{ from: location }} />;
  }

  return <AppShell />;
}

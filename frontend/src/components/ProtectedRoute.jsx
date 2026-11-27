import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-on-background flex flex-col items-center justify-center gap-4">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
          <span className="w-2.5 h-2.5 rounded-full bg-secondary animate-pulse [animation-delay:200ms]" />
          <span className="w-2.5 h-2.5 rounded-full bg-on-background animate-pulse [animation-delay:400ms]" />
        </div>
        <p className="font-mono text-mono-sm text-text-muted">Authenticating workspace...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

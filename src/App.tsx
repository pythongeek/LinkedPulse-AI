import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { Spinner } from './components/ui/spinner';

// Layouts
import DashboardLayout from './layouts/DashboardLayout';

// Auth
import ProtectedRoute from './components/ProtectedRoute';

// Pages (Lazy loaded for performance - reduces initial bundle size)
const Login = React.lazy(() => import('./pages/Login'));
const Register = React.lazy(() => import('./pages/Register'));
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Personas = React.lazy(() => import('./pages/Personas'));
const PersonaCreate = React.lazy(() => import('./pages/PersonaCreate'));
const ContentStudio = React.lazy(() => import('./pages/ContentStudio'));
const ContentHistory = React.lazy(() => import('./pages/ContentHistory'));
const TrendExplorer = React.lazy(() => import('./pages/TrendExplorer'));
const CompetitorAnalysis = React.lazy(() => import('./pages/CompetitorAnalysis'));
const ProfileAudit = React.lazy(() => import('./pages/ProfileAudit'));
const Settings = React.lazy(() => import('./pages/Settings'));
const ImageGenerator = React.lazy(() => import('./pages/ImageGenerator'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
              <Routes>
                {/* Public Auth Routes */}
                <Route path="/login" element={
                  <Suspense fallback={<div className="flex h-screen items-center justify-center"><Spinner className="h-8 w-8 text-primary" /></div>}>
                    <Login />
                  </Suspense>
                } />
                <Route path="/register" element={
                  <Suspense fallback={<div className="flex h-screen items-center justify-center"><Spinner className="h-8 w-8 text-primary" /></div>}>
                    <Register />
                  </Suspense>
                } />

                {/* Protected Dashboard Routes */}
                <Route element={<ProtectedRoute />}>
                  <Route element={<DashboardLayout />}>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/personas" element={<Personas />} />
                    <Route path="/personas/create" element={<PersonaCreate />} />
                    <Route path="/personas/edit/:id" element={<PersonaCreate />} />
                    <Route path="/content/studio" element={<ContentStudio />} />
                    <Route path="/content/history" element={<ContentHistory />} />
                    <Route path="/trends" element={<TrendExplorer />} />
                    <Route path="/competitors" element={<CompetitorAnalysis />} />
                    <Route path="/audit" element={<ProfileAudit />} />
                    <Route path="/images" element={<ImageGenerator />} />
                    <Route path="/settings" element={<Settings />} />
                  </Route>
                </Route>

                {/* Redirect */}
                <Route path="/" element={<Navigate to="/login" replace />} />
                <Route path="*" element={<Navigate to="/login" replace />} />
              </Routes>
          </BrowserRouter>
          <Toaster position="top-right" richColors />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;

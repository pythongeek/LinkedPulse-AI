import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';

// Layouts
import DashboardLayout from './layouts/DashboardLayout';

// Auth
import ProtectedRoute from './components/ProtectedRoute';

// Pages - Lazy Loaded for Code Splitting (Bolt Performance Optimization)
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Personas = lazy(() => import('./pages/Personas'));
const PersonaCreate = lazy(() => import('./pages/PersonaCreate'));
const ContentStudio = lazy(() => import('./pages/ContentStudio'));
const ContentHistory = lazy(() => import('./pages/ContentHistory'));
const TrendExplorer = lazy(() => import('./pages/TrendExplorer'));
const CompetitorAnalysis = lazy(() => import('./pages/CompetitorAnalysis'));
const ProfileAudit = lazy(() => import('./pages/ProfileAudit'));
const Settings = lazy(() => import('./pages/Settings'));
const ImageGenerator = lazy(() => import('./pages/ImageGenerator'));

// Loading fallback component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
  </div>
);

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
            <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Public Auth Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

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
            </Suspense>
          </BrowserRouter>
          <Toaster position="top-right" richColors />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;

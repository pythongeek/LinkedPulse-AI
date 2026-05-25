import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';

// Layouts
import DashboardLayout from './layouts/DashboardLayout';

// Auth
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Personas from './pages/Personas';
import PersonaCreate from './pages/PersonaCreate';
import ContentStudio from './pages/ContentStudio';
import ContentHistory from './pages/ContentHistory';
import TrendExplorer from './pages/TrendExplorer';
import CompetitorAnalysis from './pages/CompetitorAnalysis';
import ProfileAudit from './pages/ProfileAudit';
import Settings from './pages/Settings';
import ImageGenerator from './pages/ImageGenerator';

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
              <Route element={<AuthLayout />}>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
              </Route>

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

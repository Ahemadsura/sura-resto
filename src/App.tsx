import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { AuthProvider, useAuth } from './contexts/SupabaseAuthContext';
import { SubscriptionProvider, useSubscription } from './contexts/SubscriptionContext';
import Login from './components/Login';
import ManagerDashboard from './components/manager/ManagerDashboard';
import OwnerDashboard from './components/owner/OwnerDashboard';
import UpdateBanner from './components/UpdateBanner';
import ErrorBoundary from './components/ErrorBoundary';

const APP_VERSION = "0.1.0"; // Hard-coded version to avoid build issues

const theme = createTheme({
  palette: {
    primary: {
      main: '#6A1B9A', // Purple theme as requested
      light: '#9C4DCC',
      dark: '#4A148C',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#ffffff', // White as secondary
      light: '#f5f5f5',
      dark: '#e0e0e0',
      contrastText: '#6A1B9A',
    },
    background: {
      default: '#fafafa',
      paper: '#ffffff',
    },
  },
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#6A1B9A',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        contained: {
          backgroundColor: '#6A1B9A',
          '&:hover': {
            backgroundColor: '#4A148C',
          },
        },
      },
    },
  },
});

const ProtectedRoute: React.FC<{ children: React.ReactNode; role?: 'owner' | 'manager' }> = ({ children, role }) => {
  const { currentUser, logout } = useAuth();
  const { status, isDeveloperBypass, isDeveloperAccount } = useSubscription();

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (role && currentUser.role !== role) {
    return <Navigate to="/login" replace />;
  }

  // Strict subscription enforcement for non-developer accounts
  if (!isDeveloperAccount && status === 'expired') {
    // For managers, force logout immediately when subscription expires
    if (currentUser.role === 'manager') {
      logout();
      return <Navigate to="/login" replace />;
    }
    // For owners, redirect to subscription page (handled by SubscriptionGate)
  }

  return <>{children}</>;
};

const AppRoutes: React.FC = () => {
  const { currentUser } = useAuth();
  const { status, isDeveloperBypass, isDeveloperAccount } = useSubscription();

  return (
    <Routes>
      <Route 
        path="/login" 
        element={
          currentUser ? (
            <Navigate to={currentUser.role === 'owner' ? (!isDeveloperAccount && status === 'expired' ? '/subscription' : '/owner') : '/manager'} replace />
          ) : (
            <Login />
          )
        } 
      />
      <Route 
        path="/manager" 
        element={
          <ProtectedRoute role="manager">
            <ErrorBoundary>
            <ManagerDashboard />
            </ErrorBoundary>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/owner" 
        element={
          <ProtectedRoute role="owner">
            <ErrorBoundary>
            <OwnerDashboard />
            </ErrorBoundary>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/subscription" 
        element={
          <ProtectedRoute>
            <ErrorBoundary>
            <OwnerDashboard />
            </ErrorBoundary>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/" 
        element={
          <Navigate 
            to={
              currentUser 
                ? (
                    currentUser.role === 'owner'
                      ? (!isDeveloperAccount && status === 'expired' ? '/subscription' : '/owner')
                      : '/manager'
                  )
                : '/login'
            } 
            replace 
          />
        } 
      />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <SubscriptionProvider>
          <Router>
            {typeof window !== 'undefined' && window.electronAPI && <UpdateBanner />}
            <AppRoutes />
          </Router>
        </SubscriptionProvider>
      </AuthProvider>
    </ThemeProvider>
    </ErrorBoundary>
  );
};

export default App;

import { BrowserRouter, Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Home from './pages/Home';
import GameEditor from './pages/GameEditor';
import PlayerSelect from './pages/PlayerSelect';
import ScoringSession from './pages/ScoringSession';
import LiveScoring from './pages/LiveScoring';
import Results from './pages/Results';
import Login from './pages/Login';
import Register from './pages/Register';

function ProtectedRoute({ children }) {
  const { token, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center min-h-screen text-gray-400">Loading…</div>;
  return token ? children : <Navigate to="/login" replace />;
}

function BottomNav() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const inSession = location.pathname.startsWith('/session/') && !location.pathname.endsWith('/results');
  if (inSession) return null;

  return (
    <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 flex z-50">
      <NavLink
        to="/"
        end
        className={({ isActive }) =>
          `flex-1 flex flex-col items-center py-3 text-xs font-medium gap-1 ${isActive ? 'text-sky-600' : 'text-gray-500'}`
        }
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        </svg>
        Home
      </NavLink>
      <NavLink
        to="/games/new"
        className={({ isActive }) =>
          `flex-1 flex flex-col items-center py-3 text-xs font-medium gap-1 ${isActive ? 'text-sky-600' : 'text-gray-500'}`
        }
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        New Game
      </NavLink>
      {user && (
        <button
          onClick={logout}
          className="flex-1 flex flex-col items-center py-3 text-xs font-medium gap-1 text-gray-500"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
          </svg>
          Sign out
        </button>
      )}
    </nav>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="max-w-lg mx-auto pb-20">
          <Routes>
            <Route path="/login"    element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
            <Route path="/games/new" element={<ProtectedRoute><GameEditor /></ProtectedRoute>} />
            <Route path="/games/:id/edit" element={<ProtectedRoute><GameEditor /></ProtectedRoute>} />
            <Route path="/games/:id/play" element={<ProtectedRoute><PlayerSelect /></ProtectedRoute>} />
            <Route path="/session/:id" element={<ProtectedRoute><ScoringSession /></ProtectedRoute>} />
            <Route path="/session/:id/live" element={<ProtectedRoute><LiveScoring /></ProtectedRoute>} />
            <Route path="/session/:id/results" element={<ProtectedRoute><Results /></ProtectedRoute>} />
          </Routes>
        </div>
        <BottomNav />
      </AuthProvider>
    </BrowserRouter>
  );
}

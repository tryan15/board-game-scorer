import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import GameEditor from './pages/GameEditor';
import PlayerSelect from './pages/PlayerSelect';
import ScoringSession from './pages/ScoringSession';
import LiveScoring from './pages/LiveScoring';
import Results from './pages/Results';

function BottomNav() {
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
    </nav>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="max-w-lg mx-auto pb-20">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/games/new" element={<GameEditor />} />
          <Route path="/games/:id/edit" element={<GameEditor />} />
          <Route path="/games/:id/play" element={<PlayerSelect />} />
          <Route path="/session/:id" element={<ScoringSession />} />
          <Route path="/session/:id/live" element={<LiveScoring />} />
          <Route path="/session/:id/results" element={<Results />} />
        </Routes>
      </div>
      <BottomNav />
    </BrowserRouter>
  );
}

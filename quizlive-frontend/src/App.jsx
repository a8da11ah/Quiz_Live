import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/auth.store.js'

// Pages
import Login       from './pages/Login.jsx'
import Dashboard   from './pages/Dashboard.jsx'
import Questions   from './pages/Questions.jsx'
import Categories  from './pages/Categories.jsx'
import Sessions    from './pages/Sessions.jsx'
import SessionDetail from './pages/SessionDetail.jsx'
import DisplayView from './pages/DisplayView.jsx'
import JoinPage    from './pages/JoinPage.jsx'
import PlayPage    from './pages/PlayPage.jsx'

function RequireAuth({ children }) {
  const token = useAuthStore((s) => s.token)
  return token ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login"               element={<Login />} />
        <Route path="/join/:code"          element={<JoinPage />} />
        <Route path="/play/:code"          element={<PlayPage />} />
        <Route path="/sessions/:id/display" element={<DisplayView />} />

        {/* Host (auth required) */}
        <Route path="/" element={<RequireAuth><Navigate to="/dashboard" replace /></RequireAuth>} />
        <Route path="/dashboard"   element={<RequireAuth><Dashboard /></RequireAuth>} />
        <Route path="/questions"   element={<RequireAuth><Questions /></RequireAuth>} />
        <Route path="/categories"  element={<RequireAuth><Categories /></RequireAuth>} />
        <Route path="/sessions"    element={<RequireAuth><Sessions /></RequireAuth>} />
        <Route path="/sessions/:id" element={<RequireAuth><SessionDetail /></RequireAuth>} />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

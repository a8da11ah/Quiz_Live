import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/auth.store.js'
import Toast            from './components/common/Toast.jsx'

// Pages
import Login            from './pages/Login.jsx'
import Dashboard        from './pages/Dashboard.jsx'
import Questions        from './pages/Questions.jsx'
import QuestionFormPage from './pages/QuestionFormPage.jsx'
import Categories       from './pages/Categories.jsx'
import Sessions         from './pages/Sessions.jsx'
import NewSessionPage   from './pages/NewSessionPage.jsx'
import SessionDetail    from './pages/SessionDetail.jsx'
import DisplayView      from './pages/DisplayView.jsx'
import JoinPage         from './pages/JoinPage.jsx'
import PlayPage         from './pages/PlayPage.jsx'

function RequireAuth({ children }) {
  const token = useAuthStore((s) => s.token)
  return token ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Toast />
      <Routes>
        {/* Public */}
        <Route path="/login"                    element={<Login />} />
        <Route path="/join/:code"               element={<JoinPage />} />
        <Route path="/play/:code"               element={<PlayPage />} />
        <Route path="/sessions/:id/display"     element={<DisplayView />} />

        {/* Host (auth required) */}
        <Route path="/" element={<RequireAuth><Navigate to="/dashboard" replace /></RequireAuth>} />
        <Route path="/dashboard"                element={<RequireAuth><Dashboard /></RequireAuth>} />

        {/* Questions */}
        <Route path="/questions"                element={<RequireAuth><Questions /></RequireAuth>} />
        <Route path="/questions/new"            element={<RequireAuth><QuestionFormPage /></RequireAuth>} />
        <Route path="/questions/:id/edit"       element={<RequireAuth><QuestionFormPage /></RequireAuth>} />

        {/* Categories */}
        <Route path="/categories"               element={<RequireAuth><Categories /></RequireAuth>} />

        {/* Sessions */}
        <Route path="/sessions"                 element={<RequireAuth><Sessions /></RequireAuth>} />
        <Route path="/sessions/new"             element={<RequireAuth><NewSessionPage /></RequireAuth>} />
        <Route path="/sessions/:id"             element={<RequireAuth><SessionDetail /></RequireAuth>} />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

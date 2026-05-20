import { Link, useLocation } from 'react-router-dom'
import { Zap, BookOpen, FolderOpen, Play, LogOut } from 'lucide-react'
import { useAuthStore } from '../../stores/auth.store.js'

function NavLink({ to, icon: Icon, label }) {
  const location = useLocation()
  // Active if exact match or starts-with (for nested routes like /questions/new)
  const active = location.pathname === to || location.pathname.startsWith(to + '/')
  return (
    <Link
      to={to}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors
        ${active
          ? 'bg-brand-900/50 text-brand-300 border border-brand-800/50'
          : 'text-gray-400 hover:text-white hover:bg-gray-800'
        }`}
    >
      <Icon size={16} /> {label}
    </Link>
  )
}

export default function Layout({ children }) {
  const logout = useAuthStore((s) => s.logout)

  return (
    <div className="min-h-screen bg-gray-950 flex">
      <aside className="fixed top-0 left-0 h-full w-56 bg-gray-900 border-r border-gray-800 flex flex-col p-4 z-10">
        <div className="flex items-center gap-2 mb-6 px-1">
          <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
            <Zap size={16} className="text-white" />
          </div>
          <span className="font-bold text-white">QuizLive</span>
        </div>

        <nav className="flex flex-col gap-1 flex-1">
          <NavLink to="/dashboard"  icon={Zap}        label="Dashboard" />
          <NavLink to="/questions"  icon={BookOpen}    label="Questions" />
          <NavLink to="/categories" icon={FolderOpen}  label="Categories" />
          <NavLink to="/sessions"   icon={Play}        label="Sessions" />
        </nav>

        <button
          onClick={logout}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-900/20 transition-colors text-sm font-medium"
        >
          <LogOut size={16} /> Sign out
        </button>
      </aside>

      <main className="ml-56 flex-1 min-w-0 p-8">
        {children}
      </main>
    </div>
  )
}

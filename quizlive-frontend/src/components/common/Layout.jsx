import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Zap, BookOpen, FolderOpen, Play, LogOut } from 'lucide-react'
import { useAuthStore } from '../../stores/auth.store.js'
import LanguageSwitcher from './LanguageSwitcher.jsx'
import SoundToggle      from './SoundToggle.jsx'

function NavLink({ to, icon: Icon, label }) {
  const location = useLocation()
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
  const { t } = useTranslation()
  const logout = useAuthStore((s) => s.logout)

  return (
    <div className="min-h-screen bg-gray-950 flex">
      <aside className="fixed top-0 start-0 h-full w-56 bg-gray-900 border-e border-gray-800 flex flex-col p-4 z-10">
        <div className="flex items-center gap-2 mb-6 px-1">
          <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
            <Zap size={16} className="text-white" />
          </div>
          <span className="font-bold text-white">{t('app.name')}</span>
        </div>

        <nav className="flex flex-col gap-1 flex-1">
          <NavLink to="/dashboard"  icon={Zap}        label={t('nav.dashboard')} />
          <NavLink to="/questions"  icon={BookOpen}   label={t('nav.questions')} />
          <NavLink to="/categories" icon={FolderOpen} label={t('nav.categories')} />
          <NavLink to="/sessions"   icon={Play}       label={t('nav.sessions')} />
        </nav>

        <div className="flex items-center gap-2 mb-2">
          <LanguageSwitcher className="flex-1 justify-center" />
          <SoundToggle />
        </div>

        <button
          onClick={logout}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-900/20 transition-colors text-sm font-medium"
        >
          <LogOut size={16} /> {t('auth.signOut')}
        </button>
      </aside>

      <main className="ms-56 flex-1 min-w-0 p-8">
        {children}
      </main>
    </div>
  )
}

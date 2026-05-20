import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Zap, Lock } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../stores/auth.store.js'
import Button from '../components/common/Button.jsx'
import Input  from '../components/common/Input.jsx'
import LanguageSwitcher from '../components/common/LanguageSwitcher.jsx'

export default function Login() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { login, loading, error } = useAuthStore()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    const ok = await login(username, password)
    if (ok) navigate('/dashboard', { replace: true })
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-gray-950 via-gray-900 to-brand-950">
      <div className="w-full max-w-sm">
        <div className="flex justify-end mb-2">
          <LanguageSwitcher />
        </div>

        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="w-14 h-14 rounded-2xl bg-brand-600 flex items-center justify-center shadow-lg shadow-brand-900">
            <Zap size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">{t('app.name')}</h1>
        </div>

        <form onSubmit={handleSubmit} className="glass rounded-2xl p-6 flex flex-col gap-4">
          <Input
            label={t('auth.username')}
            type="text"
            placeholder="admin"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
          />
          <Input
            label={t('auth.password')}
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
          {error && (
            <p className="text-red-400 text-sm flex items-center gap-1">
              <Lock size={13} /> {error}
            </p>
          )}
          <Button type="submit" size="lg" loading={loading} className="w-full mt-1">
            {loading ? t('auth.signingIn') : t('auth.signIn')}
          </Button>
        </form>
      </div>
    </div>
  )
}

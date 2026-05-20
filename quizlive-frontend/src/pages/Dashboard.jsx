import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Zap, BookOpen, FolderOpen, Play, Plus } from 'lucide-react'
import { getSessions, getQuestions, getCategories } from '../lib/api.js'
import Button from '../components/common/Button.jsx'
import { StatusBadge } from '../components/common/Badge.jsx'
import Layout from '../components/common/Layout.jsx'

function StatCard({ icon: Icon, label, value, color = 'brand' }) {
  const colors = {
    brand:  'text-brand-400 bg-brand-900/30',
    green:  'text-emerald-400 bg-emerald-900/30',
    yellow: 'text-yellow-400 bg-yellow-900/30',
  }
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center gap-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colors[color]}`}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-2xl font-bold text-white">{value ?? '—'}</p>
        <p className="text-xs text-gray-500">{label}</p>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [stats, setStats] = useState({})
  const [recentSessions, setRecentSessions] = useState([])

  useEffect(() => {
    Promise.all([getSessions(), getQuestions(), getCategories()]).then(([s, q, c]) => {
      setStats({ sessions: s?.length || 0, questions: q?.length || 0, categories: c?.length || 0 })
      setRecentSessions((s || []).slice(0, 5))
    }).catch(() => {})
  }, [])

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Dashboard</h1>
            <p className="text-gray-400 text-sm mt-0.5">Welcome back, host</p>
          </div>
          <Link to="/sessions/new">
            <Button icon={Plus}>New Session</Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <StatCard icon={Play}       label="Sessions"   value={stats.sessions}   color="brand" />
          <StatCard icon={BookOpen}   label="Questions"  value={stats.questions}  color="green" />
          <StatCard icon={FolderOpen} label="Categories" value={stats.categories} color="yellow" />
        </div>

        {/* Recent sessions */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Recent Sessions</h2>
            <Link to="/sessions" className="text-xs text-brand-400 hover:text-brand-300 transition-colors">View all</Link>
          </div>
          {recentSessions.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-gray-800 rounded-xl">
              <p className="text-gray-500 mb-3">No sessions yet</p>
              <Link to="/sessions/new">
                <Button size="sm" icon={Plus}>Create your first session</Button>
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {recentSessions.map((s) => (
                <Link key={s.id} to={`/sessions/${s.id}`}
                  className="flex items-center gap-4 bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 hover:border-gray-700 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white truncate">{s.name}</p>
                    <p className="text-xs text-gray-500">{s.session_code || 'No code yet'}</p>
                  </div>
                  <StatusBadge status={s.status} />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}

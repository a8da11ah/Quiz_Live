import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Play, Calendar } from 'lucide-react'
import { getSessions } from '../lib/api.js'
import Button from '../components/common/Button.jsx'
import { StatusBadge } from '../components/common/Badge.jsx'

export default function Sessions() {
  const navigate = useNavigate()
  const [sessions, setSessions] = useState([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    getSessions().then(setSessions).catch(() => {}).finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen bg-gray-950 p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Play className="text-brand-400" size={22} />
            <h1 className="text-2xl font-bold text-white">Sessions</h1>
          </div>
          <Button icon={Plus} onClick={() => navigate('/sessions/new')}>New Session</Button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading…</div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-gray-800 rounded-2xl">
            <Play size={40} className="text-gray-700 mx-auto mb-3" />
            <p className="text-gray-500 mb-3">No sessions yet</p>
            <Button icon={Plus} size="sm" onClick={() => navigate('/sessions/new')}>Create a session</Button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {sessions.map((s) => (
              <Link key={s.id} to={`/sessions/${s.id}`}
                className="flex items-center gap-4 bg-gray-900 border border-gray-800 rounded-xl px-5 py-4 hover:border-gray-700 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white truncate">{s.name}</p>
                  <div className="flex items-center gap-3 mt-1">
                    {s.session_code && (
                      <span className="text-xs font-mono text-gray-500 bg-gray-800 px-2 py-0.5 rounded">{s.session_code}</span>
                    )}
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <Calendar size={11} />
                      {new Date(s.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <StatusBadge status={s.status} />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

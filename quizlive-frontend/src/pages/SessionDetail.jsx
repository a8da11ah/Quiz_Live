import { useParams } from 'react-router-dom'
import { useState } from 'react'
import { ExternalLink, Copy } from 'lucide-react'
import { useSession } from '../hooks/useSession.js'
import { useWebSocket } from '../hooks/useWebSocket.js'
import { useAuthStore } from '../stores/auth.store.js'
import { useGameStore } from '../stores/game.store.js'
import { useWsStore }   from '../stores/ws.store.js'
import { startSession } from '../lib/api.js'
import SessionControl from '../components/host/SessionControl.jsx'
import TeamList       from '../components/host/TeamList.jsx'
import Leaderboard    from '../components/common/Leaderboard.jsx'
import QRCode         from '../components/common/QRCode.jsx'
import Button         from '../components/common/Button.jsx'
import { StatusBadge } from '../components/common/Badge.jsx'
import Modal          from '../components/common/Modal.jsx'
import Layout         from '../components/common/Layout.jsx'

export default function SessionDetail() {
  const { id }   = useParams()
  const token    = useAuthStore((s) => s.token)
  const { session, loading, refetch } = useSession(id)
  const leaderboard  = useGameStore((s) => s.leaderboard)
  const pendingMarks = useGameStore((s) => s.pendingMarks)
  const send     = useWsStore((s) => s.send)
  const [forceModal, setForceModal] = useState(false)
  const [starting,   setStarting]   = useState(false)

  const sessionCode = session?.session_code
  useWebSocket(
    ['lobby', 'active', 'paused'].includes(session?.status) ? sessionCode : null,
    'host',
    token,
  )

  const handleStart = async () => {
    setStarting(true)
    try {
      await startSession(id)
      refetch()
    } catch (e) {
      alert(e.message)
    } finally {
      setStarting(false)
    }
  }

  const joinUrl = session?.session_code
    ? `${location.origin}/join/${session.session_code}`
    : null

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64 text-gray-500">Loading…</div>
      </Layout>
    )
  }
  if (!session) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64 text-red-400">Session not found</div>
      </Layout>
    )
  }

  return (
    <Layout>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">{session.name}</h1>
          <div className="flex items-center gap-3 mt-1">
            <StatusBadge status={session.status} />
            {session.session_code && (
              <span className="font-mono text-sm text-gray-400 bg-gray-800 px-2 py-0.5 rounded">
                {session.session_code}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {joinUrl && (
            <a href={`/sessions/${id}/display`} target="_blank" rel="noreferrer">
              <Button variant="secondary" size="sm" icon={ExternalLink}>Projector View</Button>
            </a>
          )}
          {session.status === 'draft' && (
            <Button onClick={handleStart} loading={starting}>Open Lobby</Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left: QR + teams */}
        <div className="col-span-1 flex flex-col gap-4">
          {joinUrl && (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 flex flex-col items-center gap-3">
              <QRCode value={joinUrl} size={160} />
              <div className="flex items-center gap-2 w-full">
                <p className="text-xs text-gray-500 flex-1 truncate">{joinUrl}</p>
                <button
                  onClick={() => navigator.clipboard.writeText(joinUrl)}
                  className="text-gray-500 hover:text-white transition-colors">
                  <Copy size={14} />
                </button>
              </div>
            </div>
          )}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
            <TeamList />
          </div>
        </div>

        {/* Middle: Control */}
        <div className="col-span-1 flex flex-col gap-4">
          {['lobby', 'active', 'paused'].includes(session.status) && (
            <SessionControl sessionId={id} onForceNext={() => setForceModal(true)} />
          )}
          {session.status === 'draft' && (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 text-center">
              <p className="text-gray-400 text-sm mb-4">Click <strong className="text-white">Open Lobby</strong> to generate the session code and start accepting teams.</p>
            </div>
          )}
          {session.status === 'finished' && (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 text-center">
              <p className="text-2xl mb-2">🏆</p>
              <p className="text-white font-semibold">Session complete!</p>
            </div>
          )}
        </div>

        {/* Right: Leaderboard */}
        <div className="col-span-1">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
            <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">Leaderboard</h3>
            {leaderboard.length ? (
              <Leaderboard rankings={leaderboard} />
            ) : (
              <p className="text-gray-600 text-sm text-center py-6">No scores yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Force-next confirmation modal */}
      <Modal open={forceModal} onClose={() => setForceModal(false)} title="Unmarked answers">
        <div className="flex flex-col gap-4">
          <p className="text-gray-300 text-sm">
            There are <span className="text-yellow-400 font-bold">{pendingMarks}</span> open-text
            answer{pendingMarks > 1 ? 's' : ''} that haven't been marked yet.
            Advancing will leave them as <em>pending</em> (0 points).
          </p>
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setForceModal(false)}>Cancel</Button>
            <Button variant="danger" onClick={() => { send?.('host.next', { force: true }); setForceModal(false) }}>
              Advance Anyway
            </Button>
          </div>
        </div>
      </Modal>
    </Layout>
  )
}

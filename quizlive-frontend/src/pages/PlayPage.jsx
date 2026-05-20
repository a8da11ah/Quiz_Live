import { useParams, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useGameStore } from '../stores/game.store.js'
import { useWsStore }   from '../stores/ws.store.js'
import { useWebSocket } from '../hooks/useWebSocket.js'
import LobbyWait    from '../components/team/LobbyWait.jsx'
import QuestionView from '../components/team/QuestionView.jsx'
import ResultView   from '../components/team/ResultView.jsx'
import FinalScreen  from '../components/team/FinalScreen.jsx'
import Leaderboard  from '../components/common/Leaderboard.jsx'
import { useState } from 'react'
import { Wifi, WifiOff } from 'lucide-react'

export default function PlayPage() {
  const { code }   = useParams()
  const navigate   = useNavigate()
  const phase      = useGameStore((s) => s.phase)
  const question   = useGameStore((s) => s.question)
  const teamId     = useGameStore((s) => s.teamId)
  const leaderboard = useGameStore((s) => s.leaderboard)
  const send       = useWsStore((s) => s.send)
  const wsStatus   = useWsStore((s) => s.status)
  const [submitted, setSubmitted] = useState(false)

  // Reset submitted state on each new question
  useEffect(() => {
    setSubmitted(false)
  }, [question?.session_question_id])

  // If there is no teamId, no pending join, and no stored identity for this
  // session, the user has no business being here — send them to JoinPage.
  const hasPendingJoin   = !!sessionStorage.getItem('quizlive_join_payload')
  const hasStoredTeam    = !!sessionStorage.getItem(`quizlive_team_${code}`)

  useEffect(() => {
    if (!teamId && phase === 'idle' && !hasPendingJoin && !hasStoredTeam) {
      navigate(`/join/${code}`, { replace: true })
    }
  }, [teamId, phase, code, navigate, hasPendingJoin, hasStoredTeam])

  // Connect whenever we have *any* credential: active teamId, a fresh-join
  // payload, or a stored identity from a previous join (page refresh).
  const shouldConnect = !!(teamId || hasPendingJoin || hasStoredTeam)
  useWebSocket(shouldConnect ? code : null, 'team')

  // Handle kicked
  if (phase === 'kicked') {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4 text-center">
        <div>
          <p className="text-4xl mb-3">😔</p>
          <p className="text-white text-xl font-bold">You were removed from the session</p>
          <p className="text-gray-400 mt-1">The host removed your team.</p>
        </div>
      </div>
    )
  }

  const handleSubmit = (sessionQuestionId, answer) => {
    send?.('answer.submit', { session_question_id: sessionQuestionId, answer })
    setSubmitted(true)
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Status bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-800">
        <span className="text-xs text-gray-500 font-mono">{code}</span>
        <div className={`flex items-center gap-1 text-xs ${wsStatus === 'connected' ? 'text-emerald-400' : 'text-red-400'}`}>
          {wsStatus === 'connected' ? <Wifi size={12} /> : <WifiOff size={12} />}
          {wsStatus}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 max-w-md mx-auto w-full">
        {phase === 'lobby' && <LobbyWait />}

        {phase === 'question' && (
          <QuestionView
            question={question}
            onSubmit={handleSubmit}
            submitted={submitted}
          />
        )}

        {(phase === 'reveal') && (
          <ResultView />
        )}

        {phase === 'leaderboard' && (
          <div className="flex flex-col gap-4 py-4">
            <h2 className="text-lg font-bold text-white text-center">Leaderboard</h2>
            <Leaderboard rankings={leaderboard} highlightTeamId={teamId} />
          </div>
        )}

        {phase === 'finished' && <FinalScreen />}

        {phase === 'paused' && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <p className="text-4xl">⏸</p>
            <p className="text-white font-semibold text-lg">Game Paused</p>
            <p className="text-gray-400 text-sm">Waiting for the host to resume…</p>
          </div>
        )}

        {(phase === 'idle' || !phase) && (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full" />
          </div>
        )}
      </div>
    </div>
  )
}

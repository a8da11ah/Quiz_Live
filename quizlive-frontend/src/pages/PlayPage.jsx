import { useParams, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useGameStore } from '../stores/game.store.js'
import { useWsStore }   from '../stores/ws.store.js'
import { useWebSocket } from '../hooks/useWebSocket.js'
import LobbyWait    from '../components/team/LobbyWait.jsx'
import QuestionView from '../components/team/QuestionView.jsx'
import ResultView   from '../components/team/ResultView.jsx'
import FinalScreen  from '../components/team/FinalScreen.jsx'
import Leaderboard  from '../components/common/Leaderboard.jsx'
import LanguageSwitcher from '../components/common/LanguageSwitcher.jsx'
import SoundToggle      from '../components/common/SoundToggle.jsx'
import { Wifi, WifiOff } from 'lucide-react'

export default function PlayPage() {
  const { t } = useTranslation()
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

  // Snapshot credential state ONCE at mount.  Reading sessionStorage on every
  // render races with useWebSocket's onopen — which clears the join payload
  // before the server's `joined` reply arrives.  In that ~1ms window all three
  // signals would be false and the redirect effect would bounce the user back
  // to /join, killing the in-flight WebSocket.
  const [initialCreds] = useState(() => ({
    hasPendingJoin: !!sessionStorage.getItem('quizlive_join_payload'),
    hasStoredTeam:  !!sessionStorage.getItem(`quizlive_team_${code}`),
  }))

  useEffect(() => {
    if (!teamId && phase === 'idle' && !initialCreds.hasPendingJoin && !initialCreds.hasStoredTeam) {
      navigate(`/join/${code}`, { replace: true })
    }
  }, [teamId, phase, code, navigate, initialCreds])

  // Connect whenever we have *any* credential.  Using the mount-time snapshot
  // here as well prevents the WS hook from being re-called with `null` mid-handshake.
  const shouldConnect = !!(teamId || initialCreds.hasPendingJoin || initialCreds.hasStoredTeam)
  useWebSocket(shouldConnect ? code : null, 'team')

  // Handle kicked
  if (phase === 'kicked') {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4 text-center">
        <div>
          <p className="text-4xl mb-3">😔</p>
          <p className="text-white text-xl font-bold">{t('play.removed')}</p>
          <p className="text-gray-400 mt-1">{t('play.removedDesc')}</p>
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
      <div className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-800 gap-3">
        <span className="text-xs text-gray-500 font-mono">{code}</span>
        <div className="flex items-center gap-2 ms-auto">
          <LanguageSwitcher />
          <SoundToggle />
          <div className={`flex items-center gap-1 text-xs ${wsStatus === 'connected' ? 'text-emerald-400' : 'text-red-400'}`}>
            {wsStatus === 'connected' ? <Wifi size={12} /> : <WifiOff size={12} />}
            {wsStatus}
          </div>
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
            <p className="text-white font-semibold text-lg">{t('play.gamePaused')}</p>
            <p className="text-gray-400 text-sm">{t('play.waitingResume')}</p>
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

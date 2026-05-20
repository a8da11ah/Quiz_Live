import { useParams } from 'react-router-dom'
import { useAuthStore } from '../stores/auth.store.js'
import { useSession } from '../hooks/useSession.js'
import { useWebSocket } from '../hooks/useWebSocket.js'
import { useGameStore } from '../stores/game.store.js'
import Countdown from '../components/common/Countdown.jsx'
import Leaderboard from '../components/common/Leaderboard.jsx'
import QRCode from '../components/common/QRCode.jsx'
import { Trophy, Users } from 'lucide-react'

function OptionBar({ label, count, total, isCorrect }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <div className={`relative rounded-xl overflow-hidden border ${isCorrect ? 'border-emerald-600' : 'border-gray-700'}`}>
      <div
        className={`absolute inset-y-0 left-0 transition-all duration-700 ${isCorrect ? 'bg-emerald-700/40' : 'bg-gray-700/30'}`}
        style={{ width: `${pct}%` }}
      />
      <div className="relative flex items-center justify-between px-4 py-3">
        <span className="font-medium text-white text-lg">{label}</span>
        <span className="text-sm text-gray-400">{pct}%</span>
      </div>
    </div>
  )
}

export default function DisplayView() {
  const { id }  = useParams()
  const token   = useAuthStore((s) => s.token)
  const { session } = useSession(id)
  const phase   = useGameStore((s) => s.phase)
  const question = useGameStore((s) => s.question)
  const reveal  = useGameStore((s) => s.reveal)
  const leaderboard = useGameStore((s) => s.leaderboard)
  const teams   = useGameStore((s) => s.teams)
  const answeredCount = useGameStore((s) => s.answeredCount)
  const winner  = useGameStore((s) => s.winner)

  const sessionCode = session?.session_code
  useWebSocket(sessionCode ? sessionCode : null, 'host', token)

  const joinUrl = sessionCode ? `${location.origin}/join/${sessionCode}` : null

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-8 font-sans">

      {/* Lobby / waiting */}
      {(phase === 'idle' || phase === 'lobby') && (
        <div className="flex flex-col items-center gap-8 text-center">
          <h1 className="text-5xl font-bold text-white">{session?.name || 'QuizLive'}</h1>
          {joinUrl && (
            <>
              <QRCode value={joinUrl} size={280} />
              <p className="text-2xl font-mono text-brand-400 tracking-widest">{sessionCode}</p>
              <p className="text-gray-400 text-xl">Scan the QR code or go to <strong className="text-white">{location.host}/join/{sessionCode}</strong></p>
            </>
          )}
          <div className="flex items-center gap-2 text-gray-400">
            <Users size={20} />
            <span className="text-lg">{teams.length} team{teams.length !== 1 ? 's' : ''} joined</span>
          </div>
        </div>
      )}

      {/* Question phase */}
      {phase === 'question' && question && (
        <div className="w-full max-w-4xl flex flex-col gap-8">
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-xl">Question {question.index + 1} of {question.total}</span>
            <Countdown startedAt={question.started_at} timeLimitSec={question.time_limit_seconds} size={120} />
            <span className="text-gray-400 text-xl">{answeredCount}/{teams.length} answered</span>
          </div>
          <h2 className="text-4xl font-bold text-white text-center leading-tight">{question.title}</h2>
          {question.media_url && (
            <img src={question.media_url} alt="" className="rounded-2xl max-h-64 object-contain mx-auto" />
          )}
          {question.options && (
            <div className="grid grid-cols-2 gap-4">
              {question.options.map((opt) => (
                <div key={opt.id} className="bg-gray-900 border border-gray-700 rounded-2xl px-6 py-4 text-white text-2xl font-medium">
                  {opt.label}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Reveal phase */}
      {(phase === 'reveal' || phase === 'leaderboard') && reveal && question && (
        <div className="w-full max-w-4xl flex gap-8">
          <div className="flex-1">
            <h2 className="text-3xl font-bold text-white mb-6">{question.title}</h2>
            <div className="flex flex-col gap-3">
              {question.options?.map((opt) => {
                const count = reveal.answer_distribution?.[opt.id] || 0
                const total = Object.values(reveal.answer_distribution || {}).reduce((a, b) => a + b, 0)
                const isCorrect = reveal.correct_answer?.option_id === opt.id ||
                                  reveal.correct_answer?.option_ids?.includes(opt.id)
                return <OptionBar key={opt.id} label={opt.label} count={count} total={total} isCorrect={isCorrect} />
              })}
            </div>
            {reveal.explanation && (
              <p className="mt-4 text-gray-300 text-lg">{reveal.explanation}</p>
            )}
          </div>
          <div className="w-72">
            <h3 className="text-gray-400 mb-3 uppercase tracking-wider text-sm font-medium">Leaderboard</h3>
            <Leaderboard rankings={leaderboard.slice(0, 6)} />
          </div>
        </div>
      )}

      {/* Finished */}
      {phase === 'finished' && (
        <div className="flex flex-col items-center gap-6 text-center">
          <Trophy size={80} className="text-yellow-400" />
          <h1 className="text-5xl font-bold text-white">Game Over!</h1>
          {winner && <p className="text-3xl text-yellow-400 font-bold">{winner.name} wins!</p>}
          <div className="w-full max-w-md mt-4">
            <Leaderboard rankings={leaderboard} />
          </div>
        </div>
      )}

      {/* Paused overlay */}
      {phase === 'paused' && (
        <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
          <div className="text-center">
            <p className="text-6xl font-bold text-white">⏸ Paused</p>
          </div>
        </div>
      )}
    </div>
  )
}

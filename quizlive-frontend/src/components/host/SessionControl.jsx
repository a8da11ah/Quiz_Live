import {
  Play, SkipForward, Pause, Square, AlertCircle,
  FastForward, Plus,
} from 'lucide-react'
import Button from '../common/Button.jsx'
import Countdown from '../common/Countdown.jsx'
import { useGameStore } from '../../stores/game.store.js'
import { useWsStore } from '../../stores/ws.store.js'

export default function SessionControl({ onForceNext }) {
  const phase         = useGameStore((s) => s.phase)
  const pendingMarks  = useGameStore((s) => s.pendingMarks)
  const answeredCount = useGameStore((s) => s.answeredCount)
  const teams         = useGameStore((s) => s.teams)
  const question      = useGameStore((s) => s.question)
  const send          = useWsStore((s) => s.send)

  const handleNext = () => {
    if (pendingMarks > 0) onForceNext?.()
    else                  send?.('host.next')
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
      <h3 className="text-sm font-medium text-gray-400 mb-4 uppercase tracking-wider">Game Control</h3>

      {/* Phase indicator strip */}
      <div className="mb-4 p-3 rounded-xl bg-gray-800/60 border border-gray-700">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${
            phase === 'question' ? 'bg-emerald-400 animate-pulse' :
            phase === 'reveal'   ? 'bg-yellow-400' :
            phase === 'lobby'    ? 'bg-blue-400' :
            phase === 'paused'   ? 'bg-orange-400' :
                                   'bg-gray-600'
          }`} />
          <span className="text-sm font-medium text-white capitalize">{phase}</span>
          {phase === 'question' && question && (
            <span className="ml-auto text-xs text-gray-400">
              {answeredCount}/{teams.length} answered
            </span>
          )}
        </div>
      </div>

      {/* Active question panel: title + inline countdown */}
      {phase === 'question' && question && (
        <div className="mb-4 p-4 rounded-xl bg-gradient-to-br from-gray-800 to-gray-850 border border-gray-700 flex gap-4 items-center">
          <Countdown
            startedAt={question.started_at}
            timeLimitSec={question.time_limit_seconds}
            size={72}
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
              Q{question.index + 1} of {question.total}
            </p>
            <p className="text-sm font-medium text-white line-clamp-2 leading-snug">
              {question.title}
            </p>
          </div>
        </div>
      )}

      {/* Pending open_text warning */}
      {pendingMarks > 0 && (
        <div className="mb-3 flex items-center gap-2 text-yellow-400 bg-yellow-900/20 border border-yellow-900/40 rounded-lg px-3 py-2 text-sm">
          <AlertCircle size={15} />
          {pendingMarks} answer{pendingMarks > 1 ? 's' : ''} need{pendingMarks === 1 ? 's' : ''} marking
        </div>
      )}

      {/* Primary buttons */}
      <div className="flex flex-col gap-2">
        {phase === 'lobby' && (
          <>
            <Button
              size="lg"
              icon={Play}
              onClick={() => send?.('host.launch')}
              disabled={teams.length === 0 || !send}
              className="w-full"
            >
              Launch Game
            </Button>
            {teams.length === 0 && (
              <p className="text-xs text-gray-500 text-center mt-1">
                Waiting for at least one team to join…
              </p>
            )}
            {teams.length > 0 && !send && (
              <p className="text-xs text-yellow-500 text-center mt-1">
                Connecting to live channel…
              </p>
            )}
          </>
        )}

        {(phase === 'reveal' || phase === 'leaderboard') && (
          <Button
            size="lg"
            icon={pendingMarks > 0 ? AlertCircle : SkipForward}
            variant={pendingMarks > 0 ? 'secondary' : 'primary'}
            onClick={handleNext}
            className="w-full"
          >
            {pendingMarks > 0 ? `Next (${pendingMarks} unmarked)` : 'Next Question'}
          </Button>
        )}

        {phase === 'question' && (
          <>
            {/* Extend timer row */}
            <div className="flex gap-2">
              <Button
                size="sm"
                icon={Plus}
                variant="secondary"
                onClick={() => send?.('host.extend_time', { seconds: 15 })}
                className="flex-1"
              >
                +15s
              </Button>
              <Button
                size="sm"
                icon={Plus}
                variant="secondary"
                onClick={() => send?.('host.extend_time', { seconds: 30 })}
                className="flex-1"
              >
                +30s
              </Button>
            </div>
            <Button
              size="md"
              icon={Pause}
              variant="secondary"
              onClick={() => send?.('host.pause')}
              className="w-full"
            >
              Pause
            </Button>
            <Button
              size="md"
              icon={FastForward}
              variant="secondary"
              onClick={() => send?.('host.skip_question')}
              className="w-full"
            >
              Skip Question
            </Button>
          </>
        )}

        {phase === 'paused' && (
          <Button size="lg" icon={Play} onClick={() => send?.('host.resume')} className="w-full">
            Resume
          </Button>
        )}

        {['question', 'reveal', 'leaderboard', 'paused'].includes(phase) && (
          <Button size="sm" icon={Square} variant="danger" onClick={() => send?.('host.finish')} className="w-full">
            End Session
          </Button>
        )}
      </div>
    </div>
  )
}

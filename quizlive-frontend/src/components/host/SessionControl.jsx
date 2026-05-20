import { Play, SkipForward, Pause, Square, CheckCircle, AlertCircle } from 'lucide-react'
import Button from '../common/Button.jsx'
import { useGameStore } from '../../stores/game.store.js'
import { useWsStore } from '../../stores/ws.store.js'

export default function SessionControl({ sessionId, onForceNext }) {
  const phase        = useGameStore((s) => s.phase)
  const pendingMarks = useGameStore((s) => s.pendingMarks)
  const answeredCount = useGameStore((s) => s.answeredCount)
  const teams        = useGameStore((s) => s.teams)
  const question     = useGameStore((s) => s.question)
  const send         = useWsStore((s) => s.send)

  const handleNext = () => {
    if (pendingMarks > 0) {
      onForceNext?.()
    } else {
      send?.('host.next')
    }
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
      <h3 className="text-sm font-medium text-gray-400 mb-4 uppercase tracking-wider">Game Control</h3>

      {/* Phase indicator */}
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
            <span className="ml-auto text-xs text-gray-500">
              {answeredCount}/{teams.length} answered
            </span>
          )}
        </div>
        {phase === 'question' && question && (
          <p className="mt-1.5 text-xs text-gray-500 truncate">Q{question.index + 1}: {question.title}</p>
        )}
      </div>

      {/* Pending open_text warning */}
      {pendingMarks > 0 && (
        <div className="mb-3 flex items-center gap-2 text-yellow-400 bg-yellow-900/20 border border-yellow-900/40 rounded-lg px-3 py-2 text-sm">
          <AlertCircle size={15} />
          {pendingMarks} answer{pendingMarks > 1 ? 's' : ''} need{pendingMarks === 1 ? 's' : ''} marking
        </div>
      )}

      {/* Buttons */}
      <div className="flex flex-col gap-2">
        {phase === 'lobby' && (
          <Button size="lg" icon={Play} onClick={() => send?.('host.launch')} className="w-full">
            Launch Game
          </Button>
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
          <Button size="md" icon={Pause} variant="secondary" onClick={() => send?.('host.pause')} className="w-full">
            Pause
          </Button>
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

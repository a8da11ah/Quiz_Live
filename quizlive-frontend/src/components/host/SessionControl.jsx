import {
  Play, SkipForward, Pause, Square, AlertCircle,
  FastForward, Plus, RotateCcw, Eye, EyeOff,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import Button from '../common/Button.jsx'
import Countdown from '../common/Countdown.jsx'
import { useGameStore } from '../../stores/game.store.js'
import { useWsStore } from '../../stores/ws.store.js'

export default function SessionControl({ onForceNext }) {
  const { t } = useTranslation()
  const phase             = useGameStore((s) => s.phase)
  const pendingMarks      = useGameStore((s) => s.pendingMarks)
  const answeredCount     = useGameStore((s) => s.answeredCount)
  const teams             = useGameStore((s) => s.teams)
  const question          = useGameStore((s) => s.question)
  const leaderboardLocked = useGameStore((s) => s.leaderboardLocked)
  const send              = useWsStore((s) => s.send)

  const handleNext = () => {
    if (pendingMarks > 0) onForceNext?.()
    else                  send?.('host.next')
  }

  const phaseLabel = t(`sessions.status.${phase === 'question' ? 'active' : phase}`, phase)

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
      <h3 className="text-sm font-medium text-gray-400 mb-4 uppercase tracking-wider">
        {t('control.title')}
      </h3>

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
          <span className="text-sm font-medium text-white capitalize">{phaseLabel}</span>
          {phase === 'question' && question && (
            <span className="ms-auto text-xs text-gray-400">
              {t('control.answeredOf', { answered: answeredCount, total: teams.length })}
            </span>
          )}
        </div>
      </div>

      {/* Active question panel */}
      {phase === 'question' && question && (
        <div className="mb-4 p-4 rounded-xl bg-gradient-to-br from-gray-800 to-gray-850 border border-gray-700 flex gap-4 items-center">
          <Countdown
            startedAt={question.started_at}
            timeLimitSec={question.time_limit_seconds}
            size={72}
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
              {t('control.qOf', { n: question.index + 1, total: question.total })}
            </p>
            <p className="text-sm font-medium text-white line-clamp-2 leading-snug">
              {question.title}
            </p>
          </div>
        </div>
      )}

      {pendingMarks > 0 && (
        <div className="mb-3 flex items-center gap-2 text-yellow-400 bg-yellow-900/20 border border-yellow-900/40 rounded-lg px-3 py-2 text-sm">
          <AlertCircle size={15} />
          {t('control.needsMarking', { count: pendingMarks })}
        </div>
      )}

      {/* Lock leaderboard toggle — visible on all live phases */}
      {['lobby', 'question', 'reveal', 'leaderboard', 'paused'].includes(phase) && (
        <button
          type="button"
          onClick={() => send?.('host.lock_leaderboard', { locked: !leaderboardLocked })}
          className="w-full mb-3 flex items-center gap-2 px-3 py-2 rounded-lg border text-xs
                     bg-gray-800/40 border-gray-700 text-gray-300 hover:text-white
                     hover:bg-gray-800 transition-colors"
        >
          {leaderboardLocked ? <EyeOff size={14} /> : <Eye size={14} />}
          <span className="flex-1 text-start">
            {leaderboardLocked ? t('control.leaderboardHidden') : t('control.leaderboardVisible')}
          </span>
          <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded
            ${leaderboardLocked ? 'bg-orange-900/40 text-orange-400' : 'bg-emerald-900/40 text-emerald-400'}`}>
            {leaderboardLocked ? 'OFF' : 'ON'}
          </span>
        </button>
      )}

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
              {t('control.launch')}
            </Button>
            {teams.length === 0 && (
              <p className="text-xs text-gray-500 text-center mt-1">
                {t('control.waitingForTeams')}
              </p>
            )}
            {teams.length > 0 && !send && (
              <p className="text-xs text-yellow-500 text-center mt-1">
                {t('control.connecting')}
              </p>
            )}
          </>
        )}

        {(phase === 'reveal' || phase === 'leaderboard') && (
          <>
            <Button
              size="lg"
              icon={pendingMarks > 0 ? AlertCircle : SkipForward}
              variant={pendingMarks > 0 ? 'secondary' : 'primary'}
              onClick={handleNext}
              className="w-full"
            >
              {pendingMarks > 0
                ? t('control.nextUnmarked', { count: pendingMarks })
                : t('control.next')}
            </Button>
            <Button
              size="sm"
              icon={RotateCcw}
              variant="secondary"
              onClick={() => send?.('host.replay_question')}
              className="w-full"
            >
              {t('control.replay')}
            </Button>
          </>
        )}

        {phase === 'question' && (
          <>
            <div className="flex gap-2">
              <Button size="sm" icon={Plus} variant="secondary"
                onClick={() => send?.('host.extend_time', { seconds: 15 })} className="flex-1">
                {t('control.extend', { seconds: 15 })}
              </Button>
              <Button size="sm" icon={Plus} variant="secondary"
                onClick={() => send?.('host.extend_time', { seconds: 30 })} className="flex-1">
                {t('control.extend', { seconds: 30 })}
              </Button>
            </div>
            <Button size="md" icon={Pause} variant="secondary"
              onClick={() => send?.('host.pause')} className="w-full">
              {t('control.pause')}
            </Button>
            <Button size="md" icon={FastForward} variant="secondary"
              onClick={() => send?.('host.skip_question')} className="w-full">
              {t('control.skip')}
            </Button>
          </>
        )}

        {phase === 'paused' && (
          <Button size="lg" icon={Play} onClick={() => send?.('host.resume')} className="w-full">
            {t('control.resume')}
          </Button>
        )}

        {['question', 'reveal', 'leaderboard', 'paused'].includes(phase) && (
          <Button size="sm" icon={Square} variant="danger"
            onClick={() => send?.('host.finish')} className="w-full">
            {t('control.end')}
          </Button>
        )}
      </div>
    </div>
  )
}

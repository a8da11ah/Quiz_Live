import { Zap, Snail, BarChart2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useGameStore } from '../../stores/game.store.js'

function fmtMs(ms) {
  if (ms == null) return '—'
  return `${(ms / 1000).toFixed(1)}s`
}

export default function QuickStats() {
  const { t }       = useTranslation()
  const fastest     = useGameStore((s) => s.fastestAnswer)
  const slowest     = useGameStore((s) => s.slowestAnswer)
  const leaderboard = useGameStore((s) => s.leaderboard)
  const phase       = useGameStore((s) => s.phase)

  // Only meaningful once the game is live
  if (!['question', 'reveal', 'leaderboard', 'paused', 'finished'].includes(phase)) {
    return null
  }

  const avgScore = leaderboard.length
    ? Math.round(leaderboard.reduce((a, b) => a + (b.score || 0), 0) / leaderboard.length)
    : 0

  const hasData = fastest || slowest || leaderboard.length > 0

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
      <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
        <BarChart2 size={14} /> {t('stats.title')}
      </h3>

      {!hasData ? (
        <p className="text-center text-gray-600 py-4 text-sm">{t('stats.noData')}</p>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 bg-gray-850 border border-gray-800 rounded-lg px-3 py-2">
            <Zap size={14} className="text-yellow-400 shrink-0" />
            <span className="text-xs text-gray-400 flex-1">{t('stats.fastest')}</span>
            <span className="text-xs text-white font-medium truncate max-w-[50%]">
              {fastest?.team_name ?? '—'}
            </span>
            <span className="text-xs text-yellow-400 tabular-nums">{fmtMs(fastest?.time_taken_ms)}</span>
          </div>

          <div className="flex items-center gap-2 bg-gray-850 border border-gray-800 rounded-lg px-3 py-2">
            <Snail size={14} className="text-gray-500 shrink-0" />
            <span className="text-xs text-gray-400 flex-1">{t('stats.slowest')}</span>
            <span className="text-xs text-white font-medium truncate max-w-[50%]">
              {slowest?.team_name ?? '—'}
            </span>
            <span className="text-xs text-gray-400 tabular-nums">{fmtMs(slowest?.time_taken_ms)}</span>
          </div>

          <div className="flex items-center gap-2 bg-gray-850 border border-gray-800 rounded-lg px-3 py-2">
            <BarChart2 size={14} className="text-brand-400 shrink-0" />
            <span className="text-xs text-gray-400 flex-1">{t('stats.avgScore')}</span>
            <span className="text-xs text-brand-300 tabular-nums">{avgScore}</span>
          </div>
        </div>
      )}
    </div>
  )
}

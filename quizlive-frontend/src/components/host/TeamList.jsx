import { UserX, Users, Minus, Plus } from 'lucide-react'
import { useGameStore } from '../../stores/game.store.js'
import { useWsStore } from '../../stores/ws.store.js'

export default function TeamList() {
  const teams = useGameStore((s) => s.teams)
  const phase = useGameStore((s) => s.phase)
  const send  = useWsStore((s) => s.send)

  const kick    = (teamId)            => send?.('host.kick',         { team_id: teamId })
  const adjust  = (teamId, delta)     => send?.('host.adjust_score', { team_id: teamId, delta })

  // Score adjustment only useful once the game is live
  const showScoreControls = ['question', 'reveal', 'leaderboard', 'paused', 'finished'].includes(phase)

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Users size={16} className="text-gray-400" />
        <span className="text-sm font-medium text-gray-400">
          {teams.length} team{teams.length !== 1 ? 's' : ''} connected
        </span>
      </div>

      {teams.length === 0 ? (
        <p className="text-center text-gray-600 py-6 text-sm">Waiting for teams to join…</p>
      ) : (
        <div className="flex flex-col gap-2">
          {teams.map((t) => (
            <div
              key={t.id}
              className="flex items-center gap-3 bg-gray-900 rounded-xl px-3 py-2.5 border border-gray-800 group"
            >
              <span className="text-xl">{t.avatar_emoji || t.avatar}</span>
              <div
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: t.color }}
              />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-white truncate text-sm">{t.name}</p>
                {showScoreControls && (
                  <p className="text-xs text-gray-500 tabular-nums">{t.score ?? 0} pts</p>
                )}
              </div>

              {showScoreControls && (
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => adjust(t.id, -10)}
                    className="p-1 rounded text-red-400 hover:bg-red-900/30"
                    title="−10 pts"
                  >
                    <Minus size={12} />
                  </button>
                  <button
                    onClick={() => adjust(t.id, 10)}
                    className="p-1 rounded text-emerald-400 hover:bg-emerald-900/30"
                    title="+10 pts"
                  >
                    <Plus size={12} />
                  </button>
                </div>
              )}

              <button
                onClick={() => kick(t.id)}
                className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-900/30 transition-all"
                title="Kick team"
              >
                <UserX size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

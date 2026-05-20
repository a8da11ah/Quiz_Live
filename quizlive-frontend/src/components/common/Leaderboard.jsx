import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, TrendingUp, TrendingDown, Minus } from 'lucide-react'

export default function Leaderboard({ rankings = [], highlightTeamId = null }) {
  return (
    <div className="flex flex-col gap-2">
      <AnimatePresence initial={false}>
        {rankings.map((team, i) => (
          <motion.div
            key={team.team_id}
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className={`
              flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors
              ${team.team_id === highlightTeamId
                ? 'bg-brand-900/40 border-brand-700'
                : 'bg-gray-900 border-gray-800'
              }
            `}
          >
            {/* Rank */}
            <div className="w-8 text-center">
              {i === 0 ? <Trophy size={20} className="text-yellow-400 mx-auto" /> :
               i === 1 ? <span className="text-gray-400 font-bold">2</span> :
               i === 2 ? <span className="text-amber-600 font-bold">3</span> :
                         <span className="text-gray-600 text-sm">{team.rank}</span>}
            </div>

            {/* Avatar */}
            <span className="text-2xl">{team.avatar}</span>

            {/* Name */}
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate text-white">{team.name}</p>
            </div>

            {/* Delta */}
            {team.delta !== undefined && (
              <div className={`flex items-center gap-0.5 text-sm font-medium
                ${team.delta > 0 ? 'text-emerald-400' :
                  team.delta < 0 ? 'text-red-400' : 'text-gray-500'}`}>
                {team.delta > 0 ? <TrendingUp size={14} /> :
                 team.delta < 0 ? <TrendingDown size={14} /> :
                                  <Minus size={14} />}
                {team.delta !== 0 && Math.abs(team.delta)}
              </div>
            )}

            {/* Score */}
            <div className="text-right">
              <p className="font-bold text-white tabular-nums">{team.score}</p>
              <p className="text-xs text-gray-500">pts</p>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

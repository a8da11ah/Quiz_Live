import { motion } from 'framer-motion'
import { CheckCircle, XCircle, Clock } from 'lucide-react'
import { useGameStore } from '../../stores/game.store.js'

export default function ResultView() {
  const result     = useGameStore((s) => s.teamResult)
  const leaderboard = useGameStore((s) => s.leaderboard)
  const teamId     = useGameStore((s) => s.teamId)

  if (!result) return null

  const myRank = leaderboard.find((t) => t.team_id === teamId)
  const isCorrect = result.result === 'correct'
  const isPending = result.result === 'pending'

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="flex flex-col items-center gap-5 py-6 text-center"
    >
      {/* Big icon */}
      <motion.div
        initial={{ scale: 0.5 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', damping: 10, stiffness: 200 }}
        className={`w-24 h-24 rounded-full flex items-center justify-center
          ${isCorrect   ? 'bg-emerald-500/20' :
            isPending   ? 'bg-yellow-500/20' :
                          'bg-red-500/20'}`}
      >
        {isCorrect  ? <CheckCircle size={48} className="text-emerald-400" /> :
         isPending  ? <Clock size={48} className="text-yellow-400" /> :
                      <XCircle size={48} className="text-red-400" />}
      </motion.div>

      <div>
        <p className={`text-2xl font-bold
          ${isCorrect ? 'text-emerald-400' :
            isPending ? 'text-yellow-400' :
                        'text-red-400'}`}>
          {isCorrect ? 'Correct!' : isPending ? 'Pending Review' : 'Incorrect'}
        </p>
        {result.points_awarded > 0 && (
          <motion.p
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-4xl font-bold text-white mt-1"
          >
            +{result.points_awarded}
          </motion.p>
        )}
        <p className="text-gray-400 text-sm mt-1">Total: {result.score_total} pts</p>
      </div>

      {/* Mini rank */}
      {myRank && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl px-6 py-4 w-full max-w-xs">
          <p className="text-xs text-gray-500 mb-1">Your ranking</p>
          <p className="text-3xl font-bold text-white">#{myRank.rank}</p>
        </div>
      )}
    </motion.div>
  )
}

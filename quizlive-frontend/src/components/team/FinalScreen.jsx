import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Trophy, Star } from 'lucide-react'
import { useGameStore } from '../../stores/game.store.js'
import Leaderboard from '../common/Leaderboard.jsx'

function Confetti() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    canvas.width  = window.innerWidth
    canvas.height = window.innerHeight

    const pieces = Array.from({ length: 120 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * -canvas.height,
      w: Math.random() * 10 + 5,
      h: Math.random() * 6 + 3,
      color: ['#6557fb','#f59e0b','#10b981','#ec4899','#06b6d4'][Math.floor(Math.random() * 5)],
      vx: (Math.random() - 0.5) * 2,
      vy: Math.random() * 3 + 2,
      angle: Math.random() * 360,
      spin: (Math.random() - 0.5) * 5,
    }))

    let raf
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      pieces.forEach((p) => {
        ctx.save()
        ctx.translate(p.x + p.w / 2, p.y + p.h / 2)
        ctx.rotate((p.angle * Math.PI) / 180)
        ctx.fillStyle = p.color
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
        ctx.restore()
        p.x += p.vx; p.y += p.vy; p.angle += p.spin
        if (p.y > canvas.height) { p.y = -p.h; p.x = Math.random() * canvas.width }
      })
      raf = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(raf)
  }, [])

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" />
}

export default function FinalScreen() {
  const winner     = useGameStore((s) => s.winner)
  const leaderboard = useGameStore((s) => s.leaderboard)
  const teamId     = useGameStore((s) => s.teamId)

  const myRank = leaderboard.find((t) => t.team_id === teamId)
  const isWinner = winner?.team_id === teamId

  return (
    <div className="relative min-h-screen flex flex-col items-center gap-6 px-4 py-8">
      <Confetti />
      <div className="relative z-10 w-full max-w-md flex flex-col gap-6">
        {/* Trophy */}
        <motion.div
          initial={{ scale: 0, rotate: -15 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', damping: 10, stiffness: 150 }}
          className="text-center"
        >
          <div className="inline-flex flex-col items-center gap-2">
            <Trophy size={56} className="text-yellow-400" />
            <h1 className="text-3xl font-bold text-white">Game Over!</h1>
            {winner && (
              <p className="text-gray-300">
                <span className="text-yellow-400 font-bold">{winner.name}</span> wins!
              </p>
            )}
          </div>
        </motion.div>

        {/* Your result */}
        {myRank && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className={`rounded-2xl border px-6 py-4 text-center
              ${isWinner
                ? 'bg-yellow-900/20 border-yellow-700'
                : 'bg-gray-900 border-gray-800'}`}
          >
            <p className="text-sm text-gray-400 mb-1">Your final rank</p>
            <p className="text-5xl font-bold text-white">#{myRank.rank}</p>
            <p className="text-xl text-gray-300 mt-1">{myRank.score} pts</p>
            {isWinner && <p className="text-yellow-400 font-bold mt-2 flex items-center justify-center gap-1"><Star size={16} /> Champion!</p>}
          </motion.div>
        )}

        {/* Full leaderboard */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <h2 className="text-sm font-medium text-gray-400 mb-3 uppercase tracking-wider">Final Standings</h2>
          <Leaderboard rankings={leaderboard} highlightTeamId={teamId} />
        </motion.div>
      </div>
    </div>
  )
}

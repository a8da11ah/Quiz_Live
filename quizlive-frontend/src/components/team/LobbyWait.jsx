import { motion } from 'framer-motion'
import { Users, Wifi } from 'lucide-react'
import { useGameStore } from '../../stores/game.store.js'

export default function LobbyWait() {
  const sessionName = useGameStore((s) => s.sessionName)
  const teams       = useGameStore((s) => s.teams)
  const teamName    = useGameStore((s) => s.teamName)

  return (
    <div className="flex flex-col items-center gap-6 text-center px-4 py-8">
      {/* Animated pulse */}
      <div className="relative">
        <motion.div
          className="w-20 h-20 rounded-full bg-brand-600/20 flex items-center justify-center"
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
        >
          <motion.div
            className="w-14 h-14 rounded-full bg-brand-600/40 flex items-center justify-center"
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut', delay: 0.1 }}
          >
            <Wifi className="text-brand-400" size={24} />
          </motion.div>
        </motion.div>
      </div>

      <div>
        <h2 className="text-xl font-bold text-white">{sessionName}</h2>
        <p className="text-gray-400 mt-1">Waiting for the host to start…</p>
      </div>

      <div className="w-full max-w-xs bg-gray-900 rounded-2xl border border-gray-800 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Users size={14} className="text-gray-400" />
          <span className="text-sm text-gray-400">{teams.length} team{teams.length !== 1 ? 's' : ''} in lobby</span>
        </div>
        <div className="flex flex-col gap-2">
          {teams.map((t) => (
            <div key={t.id} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm
              ${t.name === teamName ? 'bg-brand-900/40 border border-brand-700' : 'bg-gray-800'}`}>
              <span>{t.avatar_emoji || t.avatar}</span>
              <span className="text-white font-medium">{t.name}</span>
              {t.name === teamName && <span className="ml-auto text-xs text-brand-400">You</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

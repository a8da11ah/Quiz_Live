import { motion } from 'framer-motion'
import { Users, Wifi } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useGameStore } from '../../stores/game.store.js'

export default function LobbyWait() {
  const { t } = useTranslation()
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
        <p className="text-gray-400 mt-1">{t('join.waitingForHost')}</p>
      </div>

      <div className="w-full max-w-xs bg-gray-900 rounded-2xl border border-gray-800 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Users size={14} className="text-gray-400" />
          <span className="text-sm text-gray-400">
            {t('join.teamsInLobby', { count: teams.length })}
          </span>
        </div>
        <div className="flex flex-col gap-2">
          {teams.map((team) => (
            <div key={team.id} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm
              ${team.name === teamName ? 'bg-brand-900/40 border border-brand-700' : 'bg-gray-800'}`}>
              <span>{team.avatar_emoji || team.avatar}</span>
              <span className="text-white font-medium">{team.name}</span>
              {team.name === teamName && <span className="ms-auto text-xs text-brand-400">{t('common.you')}</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

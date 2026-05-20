import { useState } from 'react'
import { Plus, Minus, Zap } from 'lucide-react'
import Button from '../common/Button.jsx'
import Input from '../common/Input.jsx'

const COLORS  = ['#6557fb', '#e85d24', '#10b981', '#f59e0b', '#ec4899', '#06b6d4']
const AVATARS = ['🦊', '🧠', '🚀', '🐉', '⚡', '🎯', '🦁', '🐺', '🌟', '🔥']

export default function JoinForm({ sessionName, onSubmit, loading }) {
  const [teamName, setTeamName] = useState('')
  const [players,  setPlayers]  = useState([''])
  const [color,    setColor]    = useState(COLORS[0])
  const [avatar,   setAvatar]   = useState(AVATARS[0])
  const [error,    setError]    = useState('')

  const addPlayer = () => setPlayers([...players, ''])
  const removePlayer = (i) => setPlayers(players.filter((_, j) => j !== i))
  const setPlayer = (i, v) => setPlayers(players.map((p, j) => j === i ? v : p))

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')
    if (!teamName.trim()) return setError('Team name is required')
    const validPlayers = players.map((p) => p.trim()).filter(Boolean)
    if (!validPlayers.length) return setError('At least one player name is required')
    onSubmit({ team_name: teamName.trim(), players: validPlayers, color, avatar })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div>
        <h2 className="text-2xl font-bold text-white">{sessionName}</h2>
        <p className="text-gray-400 text-sm mt-1">Register your team to join the game</p>
      </div>

      <Input
        label="Team Name"
        placeholder="The Avengers"
        value={teamName}
        onChange={(e) => setTeamName(e.target.value)}
        maxLength={30}
      />

      {/* Players */}
      <div>
        <label className="text-sm font-medium text-gray-300 block mb-2">Players</label>
        <div className="flex flex-col gap-2">
          {players.map((p, i) => (
            <div key={i} className="flex gap-2">
              <input
                className="flex-1 rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
                placeholder={`Player ${i + 1}`}
                value={p}
                onChange={(e) => setPlayer(i, e.target.value)}
                maxLength={30}
              />
              {players.length > 1 && (
                <button type="button" onClick={() => removePlayer(i)}
                  className="p-2 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-900/20 transition-colors">
                  <Minus size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
        {players.length < 8 && (
          <button type="button" onClick={addPlayer}
            className="mt-2 flex items-center gap-1 text-sm text-brand-400 hover:text-brand-300 transition-colors">
            <Plus size={14} /> Add player
          </button>
        )}
      </div>

      {/* Color */}
      <div>
        <label className="text-sm font-medium text-gray-300 block mb-2">Team Color</label>
        <div className="flex gap-2">
          {COLORS.map((c) => (
            <button key={c} type="button" onClick={() => setColor(c)}
              className={`w-8 h-8 rounded-full transition-transform ${color === c ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-gray-950' : ''}`}
              style={{ backgroundColor: c }} />
          ))}
        </div>
      </div>

      {/* Avatar */}
      <div>
        <label className="text-sm font-medium text-gray-300 block mb-2">Team Avatar</label>
        <div className="flex flex-wrap gap-2">
          {AVATARS.map((a) => (
            <button key={a} type="button" onClick={() => setAvatar(a)}
              className={`text-2xl w-10 h-10 rounded-xl flex items-center justify-center transition-all
                ${avatar === a ? 'bg-brand-800 ring-2 ring-brand-500' : 'bg-gray-800 hover:bg-gray-700'}`}>
              {a}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <Button type="submit" size="lg" loading={loading} icon={Zap} className="w-full">
        Join Game
      </Button>
    </form>
  )
}

import { useParams, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { Zap, AlertCircle } from 'lucide-react'
import { joinInfo } from '../lib/api.js'
import JoinForm from '../components/team/JoinForm.jsx'
import { useGameStore } from '../stores/game.store.js'

export default function JoinPage() {
  const { code } = useParams()
  const navigate = useNavigate()
  const [info, setInfo] = useState(null)
  const [infoError, setInfoError] = useState('')

  const setTeamNameStore = (n) => useGameStore.setState({ teamName: n })

  // Fetch session info first
  useEffect(() => {
    joinInfo(code)
      .then(setInfo)
      .catch((e) => setInfoError(e.message))
  }, [code])

  const handleJoin = ({ team_name, players, color, avatar }) => {
    setTeamNameStore(team_name)
    // Store join payload so useWebSocket in PlayPage picks it up on connect
    // and sends team.join automatically — avoids opening two WebSockets.
    sessionStorage.setItem('quizlive_join_payload', JSON.stringify({ team_name, players, color, avatar }))
    navigate(`/play/${code}`)
  }

  // Status error
  if (infoError) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="text-center flex flex-col items-center gap-3">
          <AlertCircle size={40} className="text-red-400" />
          <p className="text-white font-semibold text-xl">Can't join</p>
          <p className="text-gray-400">{infoError}</p>
        </div>
      </div>
    )
  }

  if (!info) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
            <Zap size={16} className="text-white" />
          </div>
          <span className="font-bold text-white">QuizLive</span>
        </div>

        <div className="glass rounded-2xl p-6">
          <JoinForm
            sessionName={info.name}
            onSubmit={handleJoin}
            loading={false}
          />
        </div>
      </div>
    </div>
  )
}

import { useParams, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { Zap, AlertCircle } from 'lucide-react'
import { joinInfo } from '../lib/api.js'
import JoinForm from '../components/team/JoinForm.jsx'
import { useGameStore } from '../stores/game.store.js'
import { useWsStore }   from '../stores/ws.store.js'
import { useWebSocket } from '../hooks/useWebSocket.js'

const WS_BASE = import.meta.env.VITE_WS_URL || `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`

export default function JoinPage() {
  const { code } = useParams()
  const navigate = useNavigate()
  const [info, setInfo] = useState(null)
  const [infoError, setInfoError] = useState('')
  const [joining, setJoining] = useState(false)
  const [joinError, setJoinError] = useState('')
  const [connected, setConnected] = useState(false)
  const wsRef = useState(null)

  const setTeamName = (n) => useGameStore.getState().teamName // just read later
  const setTeamNameStore = (n) => useGameStore.setState({ teamName: n })

  // Fetch session info first
  useEffect(() => {
    joinInfo(code)
      .then(setInfo)
      .catch((e) => setInfoError(e.message))
  }, [code])

  const handleJoin = ({ team_name, players, color, avatar }) => {
    setJoining(true)
    setJoinError('')
    setTeamNameStore(team_name)

    const params = new URLSearchParams({ session: code, role: 'team' })
    const ws = new WebSocket(`${WS_BASE}?${params}`)

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'team.join', payload: { team_name, players, color, avatar } }))
    }

    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data)
      if (msg.type === 'joined') {
        useGameStore.getState().setJoined(msg.payload)
        useWsStore.setState({
          status: 'connected',
          send: (type, payload) => ws.readyState === WebSocket.OPEN && ws.send(JSON.stringify({ type, payload })),
        })
        // Pass the WS to PlayPage via sessionStorage (simple approach)
        sessionStorage.setItem('quizlive_ws_code', code)
        navigate(`/play/${code}`)
      } else if (msg.type === 'error') {
        setJoinError(msg.payload?.message || 'Join failed')
        setJoining(false)
        ws.close()
      }
    }

    ws.onerror = () => {
      setJoinError('Connection failed. Is the session open?')
      setJoining(false)
    }
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
            loading={joining}
          />
          {joinError && (
            <p className="mt-3 text-red-400 text-sm flex items-center gap-1">
              <AlertCircle size={13} /> {joinError}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

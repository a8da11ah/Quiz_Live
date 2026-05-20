import { useEffect, useRef, useCallback } from 'react'
import { useGameStore } from '../stores/game.store.js'
import { useWsStore } from '../stores/ws.store.js'

const WS_BASE = import.meta.env.VITE_WS_URL || `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`

/**
 * useWebSocket — establishes and manages a WebSocket connection.
 *
 * @param {string} sessionCode
 * @param {'host'|'team'} role
 * @param {string|null} token  — JWT for host role, null for team
 */
export function useWebSocket(sessionCode, role, token = null) {
  const wsRef = useRef(null)
  const reconnectTimer = useRef(null)
  const setStatus = useWsStore((s) => s.setStatus)
  const setSend   = useWsStore((s) => s.setSend)
  const clearSend = useWsStore((s) => s.clearSend)

  const game = useGameStore()

  const dispatch = useCallback((msg) => {
    switch (msg.type) {
      case 'state.sync':
        game.setStateSync(msg.payload)
        break
      case 'joined':
        game.setJoined(msg.payload)
        // Persist team identity so a page refresh can reconnect via team.rejoin
        if (sessionCode) {
          sessionStorage.setItem(
            `quizlive_team_${sessionCode}`,
            JSON.stringify({
              teamId: msg.payload.team_id,
              teamName: useGameStore.getState().teamName,
            }),
          )
        }
        break
      case 'rejoined':
        game.setRejoined(msg.payload)
        break
      case 'team.connected':
        game.addTeam(msg.payload.team)
        break
      case 'team.disconnected':
        game.removeTeam(msg.payload.team_id)
        break
      case 'game.started':
        game.setGameStarted(msg.payload)
        break
      case 'question.started':
        game.setQuestion(msg.payload)
        break
      case 'question.closed':
        game.setQuestionClosed()
        break
      case 'question.revealed':
        game.setReveal(msg.payload)
        break
      case 'answer.received':
        game.recordAnswerReceived(msg.payload)
        break
      case 'team.result':
        game.setTeamResult(msg.payload)
        break
      case 'leaderboard.updated':
        game.setLeaderboard(msg.payload)
        break
      case 'game.paused':
        game.setPaused()
        break
      case 'game.resumed':
        game.setResumed(msg.payload || {})
        break
      case 'game.finished':
        game.setFinished(msg.payload)
        break
      case 'team.kicked':
        game.setKicked()
        break
      case 'error':
        console.warn('[WS] server error:', msg.payload)
        break
      default:
        console.debug('[WS] unknown message type:', msg.type)
    }
  }, [game, sessionCode])

  const connect = useCallback(() => {
    if (!sessionCode) return
    setStatus('connecting')

    const params = new URLSearchParams({ session: sessionCode, role })
    if (token) params.set('token', token)

    const url = `${WS_BASE}?${params.toString()}`
    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {
      setStatus('connected')
      setSend((type, payload) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type, payload }))
        }
      })
      // Auto-send the right join message for team connections.
      if (role === 'team') {
        const pending = sessionStorage.getItem('quizlive_join_payload')
        if (pending) {
          // Fresh join: navigated from JoinPage
          ws.send(JSON.stringify({ type: 'team.join', payload: JSON.parse(pending) }))
          sessionStorage.removeItem('quizlive_join_payload')
        } else {
          // Possible reconnect after a page refresh — restore teamName first so
          // the lobby "You" badge works, then tell the server to re-associate us.
          const stored = sessionStorage.getItem(`quizlive_team_${sessionCode}`)
          if (stored) {
            const { teamId, teamName } = JSON.parse(stored)
            if (teamName) useGameStore.setState({ teamName })
            ws.send(JSON.stringify({ type: 'team.rejoin', payload: { team_id: teamId } }))
          }
        }
      }
    }

    ws.onmessage = (event) => {
      try {
        dispatch(JSON.parse(event.data))
      } catch (e) {
        console.error('[WS] parse error:', e)
      }
    }

    ws.onclose = (ev) => {
      clearSend()
      setStatus('disconnected')
      // Auto-reconnect unless kicked or intentionally closed (code 1000)
      if (ev.code !== 1000 && ev.code !== 4001) {
        reconnectTimer.current = setTimeout(connect, 3000)
      }
    }

    ws.onerror = () => setStatus('error')
  }, [sessionCode, role, token, setStatus, setSend, clearSend, dispatch])

  useEffect(() => {
    connect()
    return () => {
      clearTimeout(reconnectTimer.current)
      wsRef.current?.close(1000, 'component unmounted')
      clearSend()
      game.reset()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionCode, role, token])
}

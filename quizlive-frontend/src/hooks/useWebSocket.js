import { useEffect, useRef, useCallback } from 'react'
import { useGameStore } from '../stores/game.store.js'
import { useWsStore } from '../stores/ws.store.js'
import { useToastStore } from '../stores/toast.store.js'
import {
  playTeamJoin, playQuestion, playReveal,
  playCorrect, playIncorrect, playPause, playResume, playFinished,
} from '../lib/sounds.js'

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
        playTeamJoin()
        break
      case 'team.disconnected':
        game.removeTeam(msg.payload.team_id)
        break
      case 'game.started':
        game.setGameStarted(msg.payload)
        break
      case 'question.started':
        game.setQuestion(msg.payload)
        playQuestion()
        break
      case 'question.closed':
        game.setQuestionClosed()
        break
      case 'question.revealed':
        game.setReveal(msg.payload)
        playReveal()
        break
      case 'answer.received':
        game.recordAnswerReceived(msg.payload)
        break
      case 'team.result':
        game.setTeamResult(msg.payload)
        if      (msg.payload.result === 'correct')   playCorrect()
        else if (msg.payload.result === 'incorrect') playIncorrect()
        break
      case 'leaderboard.updated':
        game.setLeaderboard(msg.payload)
        break
      case 'question.extended':
        game.extendQuestionTime(msg.payload)
        useToastStore.getState().info(`Timer extended by ${msg.payload.added_seconds}s`)
        break
      case 'score.adjusted':
        // leaderboard.updated arrives right after with the recomputed rankings.
        useToastStore.getState().info(
          `Score adjusted: ${msg.payload.delta > 0 ? '+' : ''}${msg.payload.delta}`,
        )
        break
      case 'leaderboard.lock':
        game.setLeaderboardLocked(!!msg.payload.locked)
        break
      case 'game.paused':
        game.setPaused()
        playPause()
        break
      case 'game.resumed':
        game.setResumed(msg.payload || {})
        playResume()
        break
      case 'game.finished':
        game.setFinished(msg.payload)
        playFinished()
        break
      case 'team.kicked':
        game.setKicked()
        break
      case 'error': {
        const errMsg = msg.payload?.message || String(msg.payload)
        console.warn('[WS] server error:', errMsg)
        useToastStore.getState().error(errMsg)
        break
      }
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

import { useState, useEffect, useRef } from 'react'

/**
 * useCountdown — syncs with the server's absolute deadline (§11.2).
 *
 * @param {string|null} startedAt   — ISO8601 timestamp from question.started event
 * @param {number}      timeLimitSec — total time limit in seconds
 * @returns {{ remaining: number, percent: number }}  remaining in seconds (float), percentage left
 */
export function useCountdown(startedAt, timeLimitSec) {
  const [remaining, setRemaining] = useState(timeLimitSec)
  const rafRef = useRef(null)

  useEffect(() => {
    if (!startedAt || !timeLimitSec) {
      setRemaining(timeLimitSec || 0)
      return
    }

    const deadline = new Date(startedAt).getTime() + timeLimitSec * 1000

    const tick = () => {
      const rem = Math.max(0, (deadline - Date.now()) / 1000)
      setRemaining(rem)
      if (rem > 0) {
        rafRef.current = requestAnimationFrame(tick)
      }
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [startedAt, timeLimitSec])

  const percent = timeLimitSec > 0 ? (remaining / timeLimitSec) * 100 : 0

  return { remaining, percent }
}

import { useState, useEffect, useCallback } from 'react'
import { getSession } from '../lib/api.js'

/**
 * useSession — fetches and periodically refreshes a session by ID.
 */
export function useSession(sessionId, pollMs = 0) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState(null)

  const fetch = useCallback(async () => {
    if (!sessionId) return
    try {
      const data = await getSession(sessionId)
      setSession(data)
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [sessionId])

  useEffect(() => {
    fetch()
    if (!pollMs) return
    const id = setInterval(fetch, pollMs)
    return () => clearInterval(id)
  }, [fetch, pollMs])

  return { session, loading, error, refetch: fetch }
}

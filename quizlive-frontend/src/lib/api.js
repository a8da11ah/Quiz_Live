const BASE = import.meta.env.VITE_API_BASE_URL || '/api'

function getToken() {
  return localStorage.getItem('quizlive_token')
}

async function request(method, path, body) {
  const headers = { 'Content-Type': 'application/json' }
  const token = getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (res.status === 204) return null

  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw { status: res.status, message: data.error || 'Request failed' }
  return data
}

export const api = {
  get:    (path)        => request('GET',    path),
  post:   (path, body)  => request('POST',   path, body),
  put:    (path, body)  => request('PUT',    path, body),
  patch:  (path, body)  => request('PATCH',  path, body),
  delete: (path)        => request('DELETE', path),
}

// Auth
export const login = (username, password) =>
  api.post('/auth/login', { username, password })

// Categories
export const getCategories   = ()          => api.get('/categories')
export const getCategory     = (id)        => api.get(`/categories/${id}`)
export const createCategory  = (body)      => api.post('/categories', body)
export const updateCategory  = (id, body)  => api.put(`/categories/${id}`, body)
export const deleteCategory  = (id)        => api.delete(`/categories/${id}`)

// Questions
export const getQuestions    = (params = {}) => {
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== ''))
  ).toString()
  return api.get(`/questions${qs ? `?${qs}` : ''}`)
}
export const getQuestion     = (id)        => api.get(`/questions/${id}`)
export const createQuestion  = (body)      => api.post('/questions', body)
export const updateQuestion  = (id, body)  => api.put(`/questions/${id}`, body)
export const deleteQuestion  = (id)        => api.delete(`/questions/${id}`)
export const importQuestions = (items)     => api.post('/questions/import', items)

// Sessions
export const getSessions     = (params = {}) => {
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== ''))
  ).toString()
  return api.get(`/sessions${qs ? `?${qs}` : ''}`)
}
export const getSession      = (id)        => api.get(`/sessions/${id}`)
export const createSession   = (body)      => api.post('/sessions', body)
export const updateSession   = (id, body)  => api.put(`/sessions/${id}`, body)
export const deleteSession   = (id)        => api.delete(`/sessions/${id}`)

export const startSession    = (id)        => api.post(`/sessions/${id}/start`)
export const launchSession   = (id)        => api.post(`/sessions/${id}/launch`)
export const nextQuestion    = (id)        => api.post(`/sessions/${id}/next`)
export const pauseSession    = (id)        => api.post(`/sessions/${id}/pause`)
export const resumeSession   = (id)        => api.post(`/sessions/${id}/resume`)
export const finishSession   = (id)        => api.post(`/sessions/${id}/finish`)

export const getSessionTeams   = (id)      => api.get(`/sessions/${id}/teams`)
export const getSessionAnswers = (id)      => api.get(`/sessions/${id}/answers`)
export const markAnswer        = (id, body) => api.post(`/sessions/${id}/mark`, body)
export const getSessionQR      = (id)      => `${BASE}/sessions/${id}/qr`

// Join (public)
export const joinInfo = (code) => api.get(`/join/${code}`)

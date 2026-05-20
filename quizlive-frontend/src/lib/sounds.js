/**
 * Tiny sound helper.  Uses synthesized beeps via the Web Audio API so
 * we don't have to bundle audio assets or worry about CORS.  Sound is
 * off by default (localStorage 'quizlive_sound' === 'on' to enable);
 * use toggleSound() to flip it.
 */

let ctx = null
function audio() {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return null
    ctx = new AC()
  }
  return ctx
}

export function isSoundOn() {
  if (typeof localStorage === 'undefined') return false
  return localStorage.getItem('quizlive_sound') === 'on'
}

export function setSoundOn(on) {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem('quizlive_sound', on ? 'on' : 'off')
}

export function toggleSound() {
  const next = !isSoundOn()
  setSoundOn(next)
  return next
}

function tone(freq, durationMs, type = 'sine', gainVal = 0.05) {
  if (!isSoundOn()) return
  const ac = audio()
  if (!ac) return
  try {
    if (ac.state === 'suspended') ac.resume()
  } catch (_) { /* noop */ }

  const osc  = ac.createOscillator()
  const gain = ac.createGain()
  osc.type            = type
  osc.frequency.value = freq
  gain.gain.value     = gainVal

  osc.connect(gain)
  gain.connect(ac.destination)

  const now = ac.currentTime
  gain.gain.setValueAtTime(gainVal, now)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + durationMs / 1000)

  osc.start(now)
  osc.stop(now + durationMs / 1000)
}

function sequence(notes) {
  if (!isSoundOn()) return
  let offset = 0
  for (const n of notes) {
    setTimeout(() => tone(n.f, n.d, n.type ?? 'sine', n.g ?? 0.05), offset)
    offset += n.d
  }
}

// ─── Public cues ────────────────────────────────────────────────────────────

export const playTeamJoin   = () => sequence([{ f: 660, d: 90 }, { f: 880, d: 130 }])
export const playQuestion   = () => sequence([{ f: 523, d: 110 }, { f: 784, d: 160 }])
export const playReveal     = () => sequence([{ f: 880, d: 80 }, { f: 660, d: 80 }, { f: 988, d: 200 }])
export const playCorrect    = () => sequence([{ f: 784, d: 110 }, { f: 1175, d: 200 }])
export const playIncorrect  = () => tone(220, 280, 'sawtooth', 0.04)
export const playPause      = () => tone(440, 150, 'square', 0.04)
export const playResume     = () => sequence([{ f: 587, d: 80 }, { f: 784, d: 120 }])
export const playFinished   = () => sequence([
  { f: 523, d: 120 }, { f: 659, d: 120 }, { f: 784, d: 120 }, { f: 1047, d: 300 },
])
export const playTick       = () => tone(1500, 40, 'sine', 0.025)

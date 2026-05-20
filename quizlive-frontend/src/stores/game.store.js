import { create } from 'zustand'

/**
 * Game store — holds live state for the current game session.
 * Used by both the host control panel and the team mobile interface.
 */
export const useGameStore = create((set, get) => ({
  // Connection state
  phase: 'idle',        // idle | lobby | question | reveal | leaderboard | finished | paused
  sessionCode: null,
  sessionName: null,
  totalQuestions: 0,

  // Team identity (team side only)
  teamId: null,
  teamName: null,

  // Teams in lobby
  teams: [],

  // Current question
  question: null,       // { session_question_id, index, total, type, title, options, time_limit_seconds, points_value, started_at }

  // Reveal data
  reveal: null,         // { correct_answer, explanation, answer_distribution }

  // Team result for current question
  teamResult: null,     // { result, points_awarded, time_taken_ms, score_total }

  // Leaderboard
  leaderboard: [],      // [{ rank, team_id, name, score, delta, color, avatar }]

  // Final results
  winner: null,

  // Pause state
  remainingMs: null,

  // Host-only: how many teams have answered current question
  answeredCount: 0,
  answeredTeams: [],    // [{ team_id, team_name, time_taken_ms }]

  // Host-only: pending open_text marks
  pendingMarks: 0,

  // Host-only: full question queue [{ index, title, type, time_limit_seconds, points_value }]
  questionsQueue: [],

  // Host-only: index of currently-running (or last-shown) question
  currentIndex: 0,

  // Actions
  // Sent to a team that reconnects after a page refresh
  setRejoined: ({ team_id, session, teams, phase, question, total_questions }) =>
    set({
      phase: phase === 'question'    ? 'question'
           : phase === 'reveal'      ? 'reveal'
           : phase === 'leaderboard' ? 'leaderboard'
           : phase === 'finished'    ? 'finished'
           : 'lobby',
      teamId: team_id,
      sessionName: session?.name ?? null,
      teams: teams ?? [],
      question: question ?? null,
      totalQuestions: total_questions ?? 0,
    }),

  // Sent to host on connect — syncs current server state
  setStateSync: ({ phase, session, teams, total_questions, questions, current_index }) =>
    set({
      phase: phase === 'lobby' ? 'lobby'
           : phase === 'question' ? 'question'
           : phase === 'reveal' ? 'reveal'
           : phase === 'leaderboard' ? 'leaderboard'
           : phase === 'finished' ? 'finished'
           : 'lobby',
      sessionName: session?.name ?? null,
      teams: teams ?? [],
      totalQuestions: total_questions ?? 0,
      questionsQueue: questions ?? [],
      currentIndex: current_index ?? 0,
    }),

  setJoined: ({ team_id, session, teams }) =>
    set({
      phase: 'lobby',
      teamId: team_id,
      sessionName: session.name,
      teams,
    }),

  addTeam: (team) =>
    set((s) => ({ teams: [...s.teams.filter((t) => t.id !== team.id), team] })),

  removeTeam: (teamId) =>
    set((s) => ({ teams: s.teams.filter((t) => t.id !== teamId) })),

  setGameStarted: ({ total_questions }) =>
    set({ phase: 'question', totalQuestions: total_questions, answeredCount: 0, answeredTeams: [] }),

  setQuestion: (q) =>
    set({
      phase: 'question',
      question: q,
      currentIndex: q?.index ?? 0,
      reveal: null,
      teamResult: null,
      answeredCount: 0,
      answeredTeams: [],
      pendingMarks: 0,
    }),

  // Host extended the current question — push the new time limit into the
  // active question so the Countdown component picks it up.
  extendQuestionTime: ({ new_time_limit_seconds }) =>
    set((s) => ({
      question: s.question
        ? { ...s.question, time_limit_seconds: new_time_limit_seconds }
        : null,
    })),

  setQuestionClosed: () =>
    set({ phase: 'reveal' }),

  setReveal: (data) =>
    set({ phase: 'reveal', reveal: data, pendingMarks: data.pending_open_marks || 0 }),

  setTeamResult: (data) =>
    set({ teamResult: data }),

  setLeaderboard: ({ rankings }) =>
    set((s) => ({
      leaderboard: rankings,
      // Advance from reveal → leaderboard so the board screen actually shows
      phase: s.phase === 'reveal' ? 'leaderboard' : s.phase,
    })),

  recordAnswerReceived: (data) =>
    set((s) => ({
      answeredCount: s.answeredCount + 1,
      answeredTeams: [...s.answeredTeams, data],
    })),

  setPaused: () =>
    set((s) => ({ phase: 'paused', pausedFrom: s.phase })),

  setResumed: ({ remaining_ms }) =>
    set((s) => ({ phase: s.pausedFrom || 'question', remainingMs: remaining_ms })),

  setFinished: ({ winner, rankings }) =>
    set({ phase: 'finished', winner, leaderboard: rankings }),

  setKicked: () =>
    set({ phase: 'kicked' }),

  reset: () =>
    set({
      phase: 'idle',
      sessionCode: null,
      sessionName: null,
      totalQuestions: 0,
      teamId: null,
      teamName: null,
      teams: [],
      question: null,
      reveal: null,
      teamResult: null,
      leaderboard: [],
      winner: null,
      remainingMs: null,
      answeredCount: 0,
      answeredTeams: [],
      pendingMarks: 0,
    }),
}))

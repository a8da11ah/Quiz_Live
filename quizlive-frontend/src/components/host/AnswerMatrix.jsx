import { CheckCircle, XCircle, Clock, HelpCircle } from 'lucide-react'

const RESULT_ICON = {
  correct:   <CheckCircle size={14} className="text-emerald-400" />,
  incorrect: <XCircle size={14} className="text-red-400" />,
  partial:   <CheckCircle size={14} className="text-yellow-400" />,
  pending:   <Clock size={14} className="text-yellow-400" />,
  no_answer: <HelpCircle size={14} className="text-gray-500" />,
}

export default function AnswerMatrix({ questions = [], teams = [], answers = [] }) {
  // Build a lookup: answers[team_id][session_question_id]
  const lookup = {}
  for (const a of answers) {
    if (!lookup[a.team_id]) lookup[a.team_id] = {}
    lookup[a.team_id][a.session_question_id] = a
  }

  if (!questions.length || !teams.length) {
    return <p className="text-gray-500 text-sm text-center py-8">No data available</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr>
            <th className="text-left py-2 px-3 text-gray-400 font-medium w-40 sticky left-0 bg-gray-950">Team</th>
            {questions.map((q, i) => (
              <th key={q.id} className="text-center py-2 px-3 text-gray-400 font-medium min-w-[60px]">
                Q{i + 1}
              </th>
            ))}
            <th className="text-right py-2 px-3 text-gray-400 font-medium">Total</th>
          </tr>
        </thead>
        <tbody>
          {teams.map((team) => {
            const teamAnswers = lookup[team.id] || {}
            const total = team.score || 0
            return (
              <tr key={team.id} className="border-t border-gray-800 hover:bg-gray-900/60 transition-colors">
                <td className="py-2 px-3 sticky left-0 bg-gray-950">
                  <div className="flex items-center gap-2">
                    <span>{team.avatar_emoji}</span>
                    <span className="text-white truncate max-w-[120px]">{team.name}</span>
                  </div>
                </td>
                {questions.map((q) => {
                  const a = teamAnswers[q.id]
                  return (
                    <td key={q.id} className="py-2 px-3 text-center">
                      <div className="flex justify-center items-center gap-1">
                        {a ? RESULT_ICON[a.result] || RESULT_ICON.no_answer : RESULT_ICON.no_answer}
                        {a?.points_awarded > 0 && (
                          <span className="text-xs text-gray-500">{a.points_awarded}</span>
                        )}
                      </div>
                    </td>
                  )
                })}
                <td className="py-2 px-3 text-right font-bold text-white">{total}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

import { useState } from 'react'
import { Send } from 'lucide-react'
import Countdown from '../common/Countdown.jsx'
import Button from '../common/Button.jsx'

export default function QuestionView({ question, onSubmit, submitted }) {
  const [selected, setSelected] = useState(null)        // option_id or value
  const [multiSel, setMultiSel] = useState([])          // for multiple_select
  const [number,   setNumber]   = useState('')           // for closest_number
  const [text,     setText]     = useState('')           // for open_text
  const [order,    setOrder]    = useState(             // for order_items
    question?.options ? [...question.options] : []
  )

  if (!question) return null

  const { type, title, options, time_limit_seconds, started_at, index, total, media_url, points_value } = question

  const handleSubmit = () => {
    let answer
    if (type === 'multiple_choice' || type === 'true_false') {
      if (!selected) return
      answer = { option_id: selected }
    } else if (type === 'multiple_select') {
      if (!multiSel.length) return
      answer = { option_ids: multiSel }
    } else if (type === 'closest_number') {
      if (number === '') return
      answer = { value: parseFloat(number) }
    } else if (type === 'open_text') {
      if (!text.trim()) return
      answer = { text: text.trim() }
    } else if (type === 'order_items') {
      answer = { ordered_ids: order.map((o) => o.id) }
    }
    onSubmit?.(question.session_question_id, answer)
  }

  const toggleMulti = (id) => {
    setMultiSel((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const moveItem = (i, dir) => {
    const next = [...order]
    const j = i + dir
    if (j < 0 || j >= next.length) return
    ;[next[i], next[j]] = [next[j], next[i]]
    setOrder(next)
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500 font-medium">Q{index + 1} / {total}</span>
        <span className="text-xs text-brand-400 font-medium">{points_value} pts</span>
      </div>

      {/* Countdown */}
      <div className="flex justify-center">
        <Countdown startedAt={started_at} timeLimitSec={time_limit_seconds} size={100} />
      </div>

      {/* Media */}
      {media_url && (
        <img src={media_url} alt="Question media" className="rounded-xl w-full object-cover max-h-40" />
      )}

      {/* Question text */}
      <p className="text-lg font-semibold text-white leading-snug">{title}</p>

      {/* Answer UI by type */}
      {!submitted ? (
        <>
          {(type === 'multiple_choice' || type === 'true_false') && (
            <div className="flex flex-col gap-2">
              {options?.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setSelected(opt.id)}
                  className={`w-full text-left px-4 py-3 rounded-xl border font-medium transition-all
                    ${selected === opt.id
                      ? 'bg-brand-700 border-brand-500 text-white'
                      : 'bg-gray-900 border-gray-700 text-gray-200 hover:border-gray-600'
                    }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}

          {type === 'multiple_select' && (
            <div className="flex flex-col gap-2">
              <p className="text-xs text-gray-500">Select all that apply</p>
              {options?.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => toggleMulti(opt.id)}
                  className={`w-full text-left px-4 py-3 rounded-xl border font-medium transition-all
                    ${multiSel.includes(opt.id)
                      ? 'bg-brand-700 border-brand-500 text-white'
                      : 'bg-gray-900 border-gray-700 text-gray-200 hover:border-gray-600'
                    }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}

          {type === 'closest_number' && (
            <input
              type="number"
              className="w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 text-white text-lg text-center focus:outline-none focus:border-brand-500"
              placeholder="Enter your number…"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
            />
          )}

          {type === 'open_text' && (
            <textarea
              className="w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 text-white resize-none focus:outline-none focus:border-brand-500"
              rows={3}
              placeholder="Type your answer…"
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={300}
            />
          )}

          {type === 'order_items' && (
            <div className="flex flex-col gap-2">
              <p className="text-xs text-gray-500">Drag or tap arrows to reorder</p>
              {order.map((opt, i) => (
                <div key={opt.id} className="flex items-center gap-2 bg-gray-900 border border-gray-700 rounded-xl px-3 py-2">
                  <div className="flex flex-col gap-0.5">
                    <button onClick={() => moveItem(i, -1)} className="text-gray-500 hover:text-white text-xs leading-none">▲</button>
                    <button onClick={() => moveItem(i, 1)}  className="text-gray-500 hover:text-white text-xs leading-none">▼</button>
                  </div>
                  <span className="flex-1 text-white text-sm">{opt.label}</span>
                  <span className="text-gray-600 text-xs w-5 text-center">{i + 1}</span>
                </div>
              ))}
            </div>
          )}

          <Button size="lg" icon={Send} onClick={handleSubmit} className="w-full mt-2">
            Submit Answer
          </Button>
        </>
      ) : (
        <div className="flex flex-col items-center gap-3 py-6">
          <div className="w-12 h-12 rounded-full bg-brand-600/20 flex items-center justify-center">
            <Send size={20} className="text-brand-400" />
          </div>
          <p className="font-semibold text-white">Answer locked!</p>
          <p className="text-sm text-gray-500">Waiting for other teams…</p>
        </div>
      )}
    </div>
  )
}

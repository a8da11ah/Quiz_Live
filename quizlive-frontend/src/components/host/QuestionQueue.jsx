import { Check, Circle, Dot, ListOrdered } from 'lucide-react'
import { useGameStore } from '../../stores/game.store.js'

const TYPE_LABEL = {
  multiple_choice:  'MC',
  true_false:       'T/F',
  multiple_select:  'Multi',
  order_items:      'Order',
  closest_number:   'Number',
  open_text:        'Open',
}

export default function QuestionQueue() {
  const queue        = useGameStore((s) => s.questionsQueue)
  const currentIndex = useGameStore((s) => s.currentIndex)
  const phase        = useGameStore((s) => s.phase)

  if (!queue || queue.length === 0) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
        <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <ListOrdered size={14} /> Question Queue
        </h3>
        <p className="text-center text-gray-600 py-6 text-sm">No questions loaded</p>
      </div>
    )
  }

  const isLive = ['question', 'reveal', 'leaderboard'].includes(phase)

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
      <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
        <ListOrdered size={14} /> Question Queue
        <span className="ml-auto text-xs text-gray-500 normal-case tracking-normal">
          {queue.length} total
        </span>
      </h3>

      <div className="flex flex-col gap-1.5 max-h-[60vh] overflow-y-auto pr-1">
        {queue.map((q) => {
          let status
          if (!isLive) status = 'upcoming'
          else if (q.index < currentIndex) status = 'done'
          else if (q.index === currentIndex) status = 'current'
          else status = 'upcoming'

          return (
            <div
              key={q.index}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 border text-sm
                ${status === 'current' ? 'bg-brand-900/30 border-brand-700/60' :
                  status === 'done'    ? 'bg-gray-850 border-gray-800 opacity-60' :
                                         'bg-gray-850 border-gray-800'}`}
            >
              {status === 'done' ? (
                <Check size={14} className="text-emerald-400 shrink-0" />
              ) : status === 'current' ? (
                <Dot size={20} className="text-brand-400 animate-pulse shrink-0 -mx-1" />
              ) : (
                <Circle size={12} className="text-gray-600 shrink-0" />
              )}

              <span className="font-mono text-xs text-gray-500 shrink-0">
                Q{q.index + 1}
              </span>
              <span className="flex-1 truncate text-gray-200">{q.title}</span>
              <span className="text-[10px] text-gray-500 shrink-0 uppercase tracking-wider">
                {TYPE_LABEL[q.type] ?? q.type}
              </span>
              <span className="text-[10px] text-gray-500 shrink-0 tabular-nums">
                {q.time_limit_seconds}s
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

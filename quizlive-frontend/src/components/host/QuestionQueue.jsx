import { useState } from 'react'
import { Check, Circle, Dot, ListOrdered, GripVertical } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useGameStore } from '../../stores/game.store.js'
import { useWsStore } from '../../stores/ws.store.js'

const TYPE_LABEL = {
  multiple_choice:  'MC',
  true_false:       'T/F',
  multiple_select:  'Multi',
  order_items:      'Order',
  closest_number:   'Number',
  open_text:        'Open',
}

export default function QuestionQueue() {
  const { t }             = useTranslation()
  const queue             = useGameStore((s) => s.questionsQueue)
  const currentIndex      = useGameStore((s) => s.currentIndex)
  const phase             = useGameStore((s) => s.phase)
  const setQuestionsQueue = useGameStore((s) => s.setQuestionsQueue)
  const send              = useWsStore((s) => s.send)

  const [dragIdx, setDragIdx] = useState(null)

  const isLobby = phase === 'lobby'
  const isLive  = ['question', 'reveal', 'leaderboard'].includes(phase)

  if (!queue || queue.length === 0) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
        <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <ListOrdered size={14} /> {t('queue.title')}
        </h3>
        <p className="text-center text-gray-600 py-6 text-sm">{t('queue.none')}</p>
      </div>
    )
  }

  // ── Drag handlers (lobby only) ────────────────────────────────────────────
  const onDragStart = (idx) => setDragIdx(idx)
  const onDragOver  = (e)   => e.preventDefault()
  const onDrop = (toIdx) => {
    if (dragIdx == null || dragIdx === toIdx) { setDragIdx(null); return }
    const next = [...queue]
    const [moved] = next.splice(dragIdx, 1)
    next.splice(toIdx, 0, moved)
    // Re-index so the index field stays consistent
    const reindexed = next.map((q, i) => ({ ...q, index: i }))
    setQuestionsQueue(reindexed)
    // Tell the server to persist the new order
    const questionIds = reindexed.map((q) => q.question_id).filter(Boolean)
    if (questionIds.length === reindexed.length && send) {
      send('host.reorder_questions', { question_ids: questionIds })
    }
    setDragIdx(null)
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
      <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
        <ListOrdered size={14} /> {t('queue.title')}
        <span className="ms-auto text-xs text-gray-500 normal-case tracking-normal">
          {t('queue.total', { count: queue.length })}
        </span>
      </h3>

      {isLobby && (
        <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
          <GripVertical size={11} className="shrink-0" />
          {t('queue.reorderHint')}
        </p>
      )}

      <div className="flex flex-col gap-1.5 max-h-[60vh] overflow-y-auto pe-1">
        {queue.map((q, arrIdx) => {
          let status
          if (!isLive) status = 'upcoming'
          else if (q.index < currentIndex) status = 'done'
          else if (q.index === currentIndex) status = 'current'
          else status = 'upcoming'

          const isDragging = isLobby && dragIdx === arrIdx

          return (
            <div
              key={q.question_id ?? q.index}
              draggable={isLobby}
              onDragStart={isLobby ? () => onDragStart(arrIdx) : undefined}
              onDragOver={isLobby ? onDragOver : undefined}
              onDrop={isLobby ? () => onDrop(arrIdx) : undefined}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 border text-sm select-none
                ${isDragging
                  ? 'opacity-50 bg-brand-900/30 border-brand-700/60'
                  : status === 'current' ? 'bg-brand-900/30 border-brand-700/60'
                  : status === 'done'    ? 'bg-gray-850 border-gray-800 opacity-60'
                  :                        'bg-gray-850 border-gray-800'}
                ${isLobby ? 'cursor-move hover:border-gray-700' : ''}`}
            >
              {isLobby ? (
                <GripVertical size={14} className="text-gray-500 shrink-0" />
              ) : status === 'done' ? (
                <Check size={14} className="text-emerald-400 shrink-0" />
              ) : status === 'current' ? (
                <Dot size={20} className="text-brand-400 animate-pulse shrink-0 -mx-1" />
              ) : (
                <Circle size={12} className="text-gray-600 shrink-0" />
              )}

              <span className="font-mono text-xs text-gray-500 shrink-0">
                Q{arrIdx + 1}
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

import { Edit2, Trash2, Clock, Star } from 'lucide-react'
import Badge from '../common/Badge.jsx'

const TYPE_LABELS = {
  multiple_choice: 'Multiple Choice',
  true_false:      'True / False',
  multiple_select: 'Multi-Select',
  closest_number:  'Closest Number',
  order_items:     'Order Items',
  open_text:       'Open Text',
}

const DIFF_COLORS = { easy: 'green', medium: 'yellow', hard: 'red' }

export default function QuestionCard({ question, onEdit, onDelete }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors group">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-white leading-snug line-clamp-2">{question.title}</p>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <Badge>{TYPE_LABELS[question.type] || question.type}</Badge>
            <Badge color={DIFF_COLORS[question.difficulty]}>{question.difficulty}</Badge>
            {question.category?.name && (
              <Badge color="brand">{question.category.icon} {question.category.name}</Badge>
            )}
            {question.time_limit_seconds && (
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <Clock size={11} /> {question.time_limit_seconds}s
              </span>
            )}
            {question.points_value && (
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <Star size={11} /> {question.points_value}pt
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button
            onClick={() => onEdit?.(question)}
            className="p-1.5 rounded-lg text-gray-500 hover:text-brand-400 hover:bg-brand-900/30 transition-colors"
          >
            <Edit2 size={15} />
          </button>
          <button
            onClick={() => onDelete?.(question)}
            className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-900/30 transition-colors"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>
    </div>
  )
}

const colors = {
  gray:    'bg-gray-800 text-gray-300',
  brand:   'bg-brand-900/60 text-brand-300 border border-brand-800',
  green:   'bg-emerald-900/60 text-emerald-300',
  yellow:  'bg-yellow-900/60 text-yellow-300',
  red:     'bg-red-900/60 text-red-300',
  blue:    'bg-blue-900/60 text-blue-300',
  purple:  'bg-purple-900/60 text-purple-300',
}

export default function Badge({ children, color = 'gray', className = '' }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${colors[color]} ${className}`}>
      {children}
    </span>
  )
}

export function StatusBadge({ status }) {
  const map = {
    draft:     { label: 'Draft',     color: 'gray'   },
    lobby:     { label: 'Lobby',     color: 'blue'   },
    active:    { label: 'Live',      color: 'green'  },
    paused:    { label: 'Paused',    color: 'yellow' },
    finished:  { label: 'Finished',  color: 'purple' },
    cancelled: { label: 'Cancelled', color: 'red'    },
  }
  const { label, color } = map[status] || { label: status, color: 'gray' }
  return <Badge color={color}>{label}</Badge>
}

import { AlertCircle, CheckCircle, Info, X } from 'lucide-react'
import { useToastStore } from '../../stores/toast.store.js'

const ICONS = {
  error:   AlertCircle,
  success: CheckCircle,
  info:    Info,
}

const STYLES = {
  error:   'border-red-700/60 bg-red-950/95 text-red-100',
  success: 'border-emerald-700/60 bg-emerald-950/95 text-emerald-100',
  info:    'border-blue-700/60 bg-blue-950/95 text-blue-100',
}

export default function Toast() {
  const toasts  = useToastStore((s) => s.toasts)
  const dismiss = useToastStore((s) => s.dismiss)

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm pointer-events-none">
      {toasts.map((t) => {
        const Icon = ICONS[t.kind] || Info
        return (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-2 px-3 py-2.5 rounded-lg border backdrop-blur shadow-2xl ${STYLES[t.kind] || STYLES.info}`}
          >
            <Icon size={16} className="mt-0.5 shrink-0" />
            <p className="text-sm flex-1 leading-snug">{t.message}</p>
            <button
              onClick={() => dismiss(t.id)}
              className="text-current opacity-60 hover:opacity-100 transition-opacity"
              aria-label="Dismiss"
            >
              <X size={14} />
            </button>
          </div>
        )
      })}
    </div>
  )
}

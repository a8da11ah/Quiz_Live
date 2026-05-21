import { useState, useMemo } from 'react'
import { Upload, X, AlertCircle, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { importQuestions } from '../../lib/api.js'
import Button from '../common/Button.jsx'

/**
 * ImportQuestionsModal
 *
 * Props:
 *   onClose()         — called when the modal should close
 *   onImported()      — called after a successful (or partial) import so the
 *                       parent can reload the question list
 */
export default function ImportQuestionsModal({ onClose, onImported }) {
  const { t } = useTranslation()

  const [raw,        setRaw]        = useState('')
  const [importing,  setImporting]  = useState(false)
  const [result,     setResult]     = useState(null)   // { imported, errors }
  const [showErrors, setShowErrors] = useState(false)

  // Live parse preview — how many items does the JSON contain?
  const preview = useMemo(() => {
    if (!raw.trim()) return null
    try {
      const parsed = JSON.parse(raw)
      if (!Array.isArray(parsed)) return { error: 'notArray' }
      return { count: parsed.length }
    } catch {
      return { error: 'invalidJson' }
    }
  }, [raw])

  const canImport = preview && !preview.error && preview.count > 0 && !importing

  const handleImport = async () => {
    if (!canImport) return
    setImporting(true)
    setResult(null)
    try {
      const items = JSON.parse(raw)
      const data = await importQuestions(items)
      setResult(data)
      if (data.imported > 0) onImported()
    } catch (e) {
      setResult({ imported: 0, errors: [{ index: -1, title: '', error: e.message }] })
    } finally {
      setImporting(false)
    }
  }

  // Summary message after import
  const summaryMsg = () => {
    if (!result) return null
    const total    = result.imported + (result.errors?.length ?? 0)
    const failed   = result.errors?.length ?? 0
    if (failed === 0) {
      return { ok: true,  text: t('importQuestions.successAll',    { count: result.imported }) }
    }
    if (result.imported === 0) {
      return { ok: false, text: t('importQuestions.failedAll',     { count: failed }) }
    }
    return { ok: true,  text: t('importQuestions.successPartial', { imported: result.imported, total, failed }) }
  }
  const summary = summaryMsg()

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="relative w-full max-w-2xl bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 shrink-0">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Upload size={18} className="text-brand-400" />
            {t('importQuestions.title')}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors rounded-lg p-1"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col gap-4 px-6 py-4 overflow-y-auto">

          {/* Hint */}
          <p
            className="text-sm text-gray-400"
            dangerouslySetInnerHTML={{ __html: t('importQuestions.hint') }}
          />

          {/* Textarea */}
          <textarea
            className="w-full h-64 rounded-xl bg-gray-950 border border-gray-700 text-sm text-gray-200
                       font-mono p-3 resize-none focus:outline-none focus:border-brand-500
                       placeholder-gray-600 transition-colors"
            placeholder={t('importQuestions.placeholder')}
            value={raw}
            onChange={(e) => { setRaw(e.target.value); setResult(null) }}
            spellCheck={false}
            dir="ltr"
          />

          {/* Live parse feedback */}
          {preview && (
            <div className={`flex items-center gap-2 text-sm rounded-lg px-3 py-2
              ${preview.error
                ? 'bg-red-950/40 border border-red-800/50 text-red-400'
                : 'bg-emerald-950/40 border border-emerald-800/50 text-emerald-400'}`}
            >
              {preview.error ? (
                <>
                  <AlertCircle size={14} className="shrink-0" />
                  {t(`importQuestions.${preview.error}`)}
                </>
              ) : (
                <>
                  <CheckCircle2 size={14} className="shrink-0" />
                  {t('importQuestions.preview', { count: preview.count })}
                </>
              )}
            </div>
          )}

          {/* Result after import */}
          {summary && (
            <div className={`rounded-xl border px-4 py-3 text-sm
              ${summary.ok
                ? 'bg-emerald-950/40 border-emerald-800/50 text-emerald-300'
                : 'bg-red-950/40 border-red-800/50 text-red-300'}`}
            >
              <p className="font-medium">{summary.text}</p>

              {result.errors?.length > 0 && (
                <div className="mt-2">
                  <button
                    onClick={() => setShowErrors((s) => !s)}
                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors"
                  >
                    {showErrors ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    {t('importQuestions.errorDetails')}
                  </button>
                  {showErrors && (
                    <ul className="mt-2 space-y-1 text-xs text-red-400 font-mono">
                      {result.errors.map((e, i) => (
                        <li key={i}>
                          {t('importQuestions.errorRow', {
                            index: e.index + 1,
                            title: e.title || '—',
                            error: e.error,
                          })}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-800 shrink-0">
          <Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
          <Button
            icon={Upload}
            onClick={handleImport}
            disabled={!canImport}
            loading={importing}
          >
            {importing ? t('importQuestions.importing') : t('importQuestions.import')}
          </Button>
        </div>
      </div>
    </div>
  )
}

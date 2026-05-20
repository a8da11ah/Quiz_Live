import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CheckSquare, Square, Search, Save, GripVertical, X } from 'lucide-react'
import { createSession, getQuestions, getCategories } from '../lib/api.js'
import Button from '../components/common/Button.jsx'
import Input  from '../components/common/Input.jsx'
import Layout from '../components/common/Layout.jsx'
import Badge  from '../components/common/Badge.jsx'

const SCORING_MODE_KEYS = ['standard', 'speed_bonus', 'streak', 'elimination']

const TYPE_LABELS = {
  multiple_choice: 'MC', true_false: 'T/F', multiple_select: 'Multi',
  closest_number: 'Num', order_items: 'Order', open_text: 'Text',
}

export default function NewSessionPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const [name,        setName]        = useState('')
  const [scoringMode, setScoringMode] = useState('standard')
  const [selectedIds, setSelectedIds] = useState([])     // ORDERED list of question ids
  const [questions,   setQuestions]   = useState([])
  const [categories,  setCategories]  = useState([])
  const [search,      setSearch]      = useState('')
  const [catFilter,   setCatFilter]   = useState('')
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState('')

  // Drag state for the selected list reordering
  const [dragIdx, setDragIdx] = useState(null)

  useEffect(() => {
    getQuestions().then(setQuestions).catch(() => {})
    getCategories().then(setCategories).catch(() => {})
  }, [])

  const filtered = questions.filter((q) => {
    const matchSearch = !search || q.title.toLowerCase().includes(search.toLowerCase())
    const matchCat    = !catFilter || q.category_id === catFilter
    return matchSearch && matchCat
  })

  const toggleQuestion = (qId) => {
    setSelectedIds((prev) =>
      prev.includes(qId) ? prev.filter((x) => x !== qId) : [...prev, qId]
    )
  }

  const removeSelected = (qId) =>
    setSelectedIds((prev) => prev.filter((x) => x !== qId))

  const toggleAll = () => {
    if (filtered.every((q) => selectedIds.includes(q.id))) {
      setSelectedIds((prev) => prev.filter((id) => !filtered.find((q) => q.id === id)))
    } else {
      const newIds = filtered.map((q) => q.id).filter((id) => !selectedIds.includes(id))
      setSelectedIds((prev) => [...prev, ...newIds])
    }
  }

  // ── DnD reorder of the selected list ─────────────────────────────────────
  const onDragStart = (idx) => setDragIdx(idx)
  const onDragOver  = (e)  => e.preventDefault()
  const onDrop = (toIdx) => {
    if (dragIdx == null || dragIdx === toIdx) { setDragIdx(null); return }
    setSelectedIds((prev) => {
      const next = [...prev]
      const [moved] = next.splice(dragIdx, 1)
      next.splice(toIdx, 0, moved)
      return next
    })
    setDragIdx(null)
  }

  const handleSave = async () => {
    setError('')
    if (!name.trim()) return setError(t('sessions.nameRequired'))
    if (selectedIds.length === 0) return setError(t('sessions.atLeastOneQuestion'))

    setSaving(true)
    try {
      const sess = await createSession({
        name: name.trim(),
        scoring_mode: scoringMode,
        scoring_config: {},
        question_ids: selectedIds,
      })
      navigate(`/sessions/${sess.id}`)
    } catch (e) {
      setError(e.message || t('errors.requestFailed'))
    } finally {
      setSaving(false)
    }
  }

  const allFilteredSelected = filtered.length > 0 && filtered.every((q) => selectedIds.includes(q.id))

  // Map of id → question record, for the selected order list
  const byId = Object.fromEntries(questions.map((q) => [q.id, q]))

  return (
    <Layout>
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white">{t('sessions.new')}</h1>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => navigate('/sessions')}>
              {t('common.cancel')}
            </Button>
            <Button icon={Save} loading={saving} onClick={handleSave}>
              {t('sessions.createSession')}
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <Input
            label={t('sessions.sessionName')}
            placeholder={t('sessions.sessionNamePlaceholder')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
          />

          <div>
            <label className="text-sm font-medium text-gray-300 block mb-2">
              {t('sessions.scoringMode')}
            </label>
            <div className="grid grid-cols-2 gap-3">
              {SCORING_MODE_KEYS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setScoringMode(m)}
                  className={`text-start px-4 py-3 rounded-xl border transition-colors
                    ${scoringMode === m
                      ? 'bg-brand-900/40 border-brand-700'
                      : 'bg-gray-900 border-gray-700 hover:border-gray-600'}`}
                >
                  <p className={`font-medium text-sm ${scoringMode === m ? 'text-brand-300' : 'text-white'}`}>
                    {t(`scoring.${m}.label`)}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">{t(`scoring.${m}.desc`)}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Selected (drag to reorder) */}
          {selectedIds.length > 0 && (
            <div>
              <label className="text-sm font-medium text-gray-300 block mb-2">
                {t('sessions.selectedOrder')}
                <span className="ms-2 text-brand-400 font-bold">
                  {t('sessions.questionsSelected', { count: selectedIds.length })}
                </span>
              </label>
              <div className="flex flex-col gap-1.5 bg-gray-950/50 border border-gray-800 rounded-xl p-2">
                {selectedIds.map((id, idx) => {
                  const q = byId[id]
                  if (!q) return null
                  return (
                    <div
                      key={id}
                      draggable
                      onDragStart={() => onDragStart(idx)}
                      onDragOver={onDragOver}
                      onDrop={() => onDrop(idx)}
                      className={`flex items-center gap-2 px-2 py-2 rounded-lg cursor-move
                        ${dragIdx === idx
                          ? 'bg-brand-900/40 border border-brand-700/60 opacity-60'
                          : 'bg-gray-900 border border-gray-800 hover:border-gray-700'}`}
                    >
                      <GripVertical size={14} className="text-gray-500 shrink-0" />
                      <span className="font-mono text-xs text-gray-500 shrink-0 w-6">
                        {idx + 1}.
                      </span>
                      <span className="flex-1 text-sm text-white truncate">{q.title}</span>
                      <Badge>{TYPE_LABELS[q.type] || q.type}</Badge>
                      <button
                        type="button"
                        onClick={() => removeSelected(id)}
                        className="text-gray-500 hover:text-red-400 p-1 rounded"
                        title={t('common.delete')}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Question picker */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-gray-300">
                {t('sessions.questionsLabel')}
              </label>
              <button
                type="button"
                onClick={toggleAll}
                className="text-xs text-gray-400 hover:text-white transition-colors"
              >
                {allFilteredSelected ? t('common.deselectAll') : t('common.selectAll')}
              </button>
            </div>

            <div className="flex gap-2 mb-3">
              <div className="relative flex-1">
                <Search size={13} className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  className="w-full ps-8 pe-3 py-1.5 rounded-lg bg-gray-900 border border-gray-700 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-brand-500"
                  placeholder={t('common.search')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <select
                className="px-3 py-1.5 rounded-lg bg-gray-900 border border-gray-700 text-sm text-white focus:outline-none focus:border-brand-500"
                value={catFilter}
                onChange={(e) => setCatFilter(e.target.value)}>
                <option value="">{t('sessions.allCategories')}</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
              </select>
            </div>

            {filtered.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-8 border border-dashed border-gray-800 rounded-xl">
                {questions.length === 0 ? t('sessions.noQuestionsLibrary') : t('sessions.noQuestionsMatch')}
              </p>
            ) : (
              <div className="flex flex-col gap-1.5 max-h-[400px] overflow-y-auto pe-1">
                {filtered.map((q) => {
                  const selected = selectedIds.includes(q.id)
                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => toggleQuestion(q.id)}
                      className={`flex items-center gap-3 text-start px-3 py-2.5 rounded-xl border transition-colors
                        ${selected
                          ? 'bg-brand-900/30 border-brand-800'
                          : 'bg-gray-900 border-gray-800 hover:border-gray-700'}`}
                    >
                      {selected
                        ? <CheckSquare size={16} className="text-brand-400 shrink-0" />
                        : <Square size={16} className="text-gray-600 shrink-0" />}
                      <span className="flex-1 text-sm text-white truncate">{q.title}</span>
                      <Badge>{TYPE_LABELS[q.type] || q.type}</Badge>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {error && (
            <div className="bg-red-900/20 border border-red-800 rounded-xl px-4 py-3 text-red-400 text-sm">
              {error}
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}

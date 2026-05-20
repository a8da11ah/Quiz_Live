import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Plus, Trash2, ArrowUp, ArrowDown, Save } from 'lucide-react'
import { createQuestion, updateQuestion, getQuestion, getCategories } from '../lib/api.js'
import Button from '../components/common/Button.jsx'
import Input  from '../components/common/Input.jsx'
import Layout from '../components/common/Layout.jsx'

const QUESTION_TYPES = [
  { value: 'multiple_choice',  label: 'Multiple Choice' },
  { value: 'true_false',       label: 'True / False' },
  { value: 'multiple_select',  label: 'Multiple Select' },
  { value: 'closest_number',   label: 'Closest Number' },
  { value: 'order_items',      label: 'Order Items' },
  { value: 'open_text',        label: 'Open Text' },
]
const DIFFICULTIES = ['easy', 'medium', 'hard']

// Types that use selectable options
const OPTION_TYPES = ['multiple_choice', 'true_false', 'multiple_select', 'order_items']

function OptionRow({ label, index, isCorrect, multiCorrect, onLabelChange, onRemove, onMoveUp, onMoveDown, onToggleCorrect, readOnly }) {
  return (
    <div className={`flex items-center gap-2 rounded-xl border px-3 py-2 transition-colors
      ${isCorrect ? 'border-emerald-700 bg-emerald-900/20' : 'border-gray-700 bg-gray-900'}`}>
      <div className="flex flex-col gap-0.5 shrink-0">
        <button type="button" onClick={onMoveUp}  className="text-gray-600 hover:text-gray-400 leading-none text-xs">▲</button>
        <button type="button" onClick={onMoveDown} className="text-gray-600 hover:text-gray-400 leading-none text-xs">▼</button>
      </div>
      <span className="text-gray-500 text-sm w-5 shrink-0">{index + 1}.</span>
      {readOnly ? (
        <span className="flex-1 text-white text-sm">{label}</span>
      ) : (
        <input
          className="flex-1 bg-transparent text-white text-sm focus:outline-none placeholder-gray-600"
          placeholder={`Option ${index + 1}`}
          value={label}
          onChange={(e) => onLabelChange(e.target.value)}
          maxLength={200}
        />
      )}
      <button
        type="button"
        onClick={onToggleCorrect}
        title={isCorrect ? 'Mark as incorrect' : 'Mark as correct'}
        className={`shrink-0 text-xs px-2 py-0.5 rounded-md font-medium transition-colors
          ${isCorrect
            ? 'bg-emerald-700 text-emerald-100'
            : 'bg-gray-800 text-gray-500 hover:bg-emerald-900/40 hover:text-emerald-400'}`}>
        {isCorrect ? '✓ Correct' : 'Correct?'}
      </button>
      {!readOnly && (
        <button type="button" onClick={onRemove} className="shrink-0 text-gray-600 hover:text-red-400 transition-colors">
          <Trash2 size={14} />
        </button>
      )}
    </div>
  )
}

export default function QuestionFormPage() {
  const { id }   = useParams()
  const navigate = useNavigate()
  const isEdit   = Boolean(id)

  const [type,        setType]        = useState('multiple_choice')
  const [title,       setTitle]       = useState('')
  const [difficulty,  setDifficulty]  = useState('medium')
  const [categoryId,  setCategoryId]  = useState('')
  const [timeLimit,   setTimeLimit]   = useState('')
  const [points,      setPoints]      = useState('')
  const [mediaUrl,    setMediaUrl]    = useState('')
  const [explanation, setExplanation] = useState('')

  // Options state
  const [options,          setOptions]          = useState([{ label: '' }, { label: '' }])
  // Indices of correct options (for MC/TF: single index; for MS: multiple; for Order: current order IS correct)
  const [correctIndices,   setCorrectIndices]   = useState([0])

  // closest_number fields
  const [numTarget, setNumTarget] = useState('')
  const [numUnit,   setNumUnit]   = useState('')

  // open_text field
  const [openRef,   setOpenRef]   = useState('')

  const [categories, setCategories] = useState([])
  const [saving,     setSaving]     = useState(false)
  const [error,      setError]      = useState('')

  useEffect(() => {
    getCategories().then(setCategories).catch(() => {})
  }, [])

  // Load existing question for edit
  useEffect(() => {
    if (!isEdit) return
    getQuestion(id).then((q) => {
      setType(q.type)
      setTitle(q.title)
      setDifficulty(q.difficulty)
      setCategoryId(q.category_id || '')
      setTimeLimit(q.time_limit_seconds ? String(q.time_limit_seconds) : '')
      setPoints(q.points_value ? String(q.points_value) : '')
      setMediaUrl(q.media_url || '')
      setExplanation(q.explanation || '')

      if (q.options?.length) {
        setOptions(q.options.map((o) => ({ label: o.label, id: o.id })))
        // Try to pre-select correct indices from existing correct_answer
        try {
          const ca = typeof q.correct_answer === 'string' ? JSON.parse(q.correct_answer) : q.correct_answer
          if (ca.option_id) {
            const idx = q.options.findIndex((o) => o.id === ca.option_id)
            if (idx >= 0) setCorrectIndices([idx])
          } else if (ca.option_ids) {
            const idxs = ca.option_ids.map((oid) => q.options.findIndex((o) => o.id === oid)).filter((i) => i >= 0)
            setCorrectIndices(idxs)
          } else if (ca.ordered_ids) {
            // Order is already reflected in the options array from DB
            setCorrectIndices([])
          }
        } catch {}
      }

      if (q.type === 'closest_number') {
        try {
          const ca = typeof q.correct_answer === 'string' ? JSON.parse(q.correct_answer) : q.correct_answer
          setNumTarget(ca.target !== undefined ? String(ca.target) : '')
          setNumUnit(ca.unit || '')
        } catch {}
      }
      if (q.type === 'open_text') {
        try {
          const ca = typeof q.correct_answer === 'string' ? JSON.parse(q.correct_answer) : q.correct_answer
          setOpenRef(ca.reference || '')
        } catch {}
      }
    }).catch(() => navigate('/questions'))
  }, [id, isEdit, navigate])

  // When type changes, reset options to sensible defaults
  const handleTypeChange = (newType) => {
    setType(newType)
    setCorrectIndices([0])
    if (newType === 'true_false') {
      setOptions([{ label: 'True' }, { label: 'False' }])
    } else if (OPTION_TYPES.includes(newType)) {
      setOptions([{ label: '' }, { label: '' }])
    }
  }

  const addOption = () => {
    if (options.length >= 6) return
    setOptions([...options, { label: '' }])
  }

  const removeOption = (i) => {
    if (options.length <= 2) return
    const next = options.filter((_, j) => j !== i)
    setOptions(next)
    setCorrectIndices(correctIndices.filter((ci) => ci !== i).map((ci) => (ci > i ? ci - 1 : ci)))
  }

  const updateOptionLabel = (i, label) => {
    setOptions(options.map((o, j) => (j === i ? { ...o, label } : o)))
  }

  const moveOption = (i, dir) => {
    const j = i + dir
    if (j < 0 || j >= options.length) return
    const next = [...options]
    ;[next[i], next[j]] = [next[j], next[i]]
    setOptions(next)
    // Update correct indices to follow the swap
    setCorrectIndices(correctIndices.map((ci) => {
      if (ci === i) return j
      if (ci === j) return i
      return ci
    }))
  }

  const toggleCorrect = (i) => {
    if (type === 'multiple_choice' || type === 'true_false') {
      setCorrectIndices([i])
    } else if (type === 'multiple_select') {
      setCorrectIndices((prev) =>
        prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]
      )
    }
    // order_items: no correct toggle — current order IS the answer
  }

  const handleSave = async () => {
    setError('')
    if (!title.trim()) return setError('Question title is required.')
    if (OPTION_TYPES.includes(type)) {
      const filled = options.filter((o) => o.label.trim())
      if (filled.length < 2) return setError('At least 2 options are required.')
      if ((type === 'multiple_choice' || type === 'true_false') && correctIndices.length === 0)
        return setError('Please mark the correct answer.')
      if (type === 'multiple_select' && correctIndices.length === 0)
        return setError('Please mark at least one correct answer.')
    }
    if (type === 'closest_number' && numTarget === '') return setError('Enter the target number.')
    if (type === 'open_text' && !openRef.trim()) return setError('Enter a reference answer.')

    setSaving(true)
    try {
      // Build correct_answer (placeholder for option-based types)
      let correctAnswer = {}
      if (type === 'closest_number') {
        correctAnswer = { target: parseFloat(numTarget), unit: numUnit || undefined }
      } else if (type === 'open_text') {
        correctAnswer = { reference: openRef.trim() }
      }
      // For option-based types: send {} placeholder, then update after we have real option IDs

      const optionsList = OPTION_TYPES.includes(type)
        ? options.filter((o) => o.label.trim()).map((o, i) => ({ label: o.label.trim(), sort_order: i }))
        : []

      const body = {
        type,
        title: title.trim(),
        difficulty,
        category_id: categoryId || undefined,
        time_limit_seconds: timeLimit ? parseInt(timeLimit) : undefined,
        points_value: points ? parseInt(points) : undefined,
        media_url: mediaUrl.trim() || undefined,
        explanation: explanation.trim() || undefined,
        correct_answer: correctAnswer,
        options: optionsList,
      }

      // Step 1: create or update
      const saved = isEdit
        ? await updateQuestion(id, body)
        : await createQuestion(body)

      // Step 2: for option-based types, update correct_answer with real option IDs
      if (OPTION_TYPES.includes(type) && saved.options?.length) {
        let realCA = {}
        if (type === 'multiple_choice' || type === 'true_false') {
          const opt = saved.options[correctIndices[0]]
          if (opt) realCA = { option_id: opt.id }
        } else if (type === 'multiple_select') {
          realCA = { option_ids: correctIndices.map((ci) => saved.options[ci]?.id).filter(Boolean) }
        } else if (type === 'order_items') {
          // Current order of options IS the correct order
          realCA = { ordered_ids: saved.options.map((o) => o.id) }
        }
        await updateQuestion(saved.id, { ...body, correct_answer: realCA })
      }

      navigate('/questions')
    } catch (e) {
      setError(e.message || 'Failed to save question.')
    } finally {
      setSaving(false)
    }
  }

  const isTrueFalse = type === 'true_false'

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white">{isEdit ? 'Edit Question' : 'New Question'}</h1>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => navigate('/questions')}>Cancel</Button>
            <Button icon={Save} loading={saving} onClick={handleSave}>Save Question</Button>
          </div>
        </div>

        <div className="flex flex-col gap-5">
          {/* Type */}
          <div>
            <label className="text-sm font-medium text-gray-300 block mb-2">Question Type</label>
            <div className="grid grid-cols-3 gap-2">
              {QUESTION_TYPES.map((qt) => (
                <button
                  key={qt.value}
                  type="button"
                  onClick={() => handleTypeChange(qt.value)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors text-left
                    ${type === qt.value
                      ? 'bg-brand-800 border-brand-600 text-brand-200'
                      : 'bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-600 hover:text-white'}`}
                >
                  {qt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="text-sm font-medium text-gray-300 block mb-2">Question Text</label>
            <textarea
              className="w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 text-white resize-none focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
              rows={3}
              placeholder="What is the capital of France?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={1000}
            />
          </div>

          {/* Options (for option-based types) */}
          {OPTION_TYPES.includes(type) && (
            <div>
              <label className="text-sm font-medium text-gray-300 block mb-2">
                {type === 'order_items'
                  ? 'Items (set them in the correct order)'
                  : type === 'multiple_select'
                  ? 'Options (mark all correct answers)'
                  : 'Options (mark the correct answer)'}
              </label>
              <div className="flex flex-col gap-2">
                {options.map((opt, i) => (
                  <OptionRow
                    key={i}
                    index={i}
                    label={opt.label}
                    isCorrect={correctIndices.includes(i)}
                    readOnly={isTrueFalse}
                    onLabelChange={(v) => updateOptionLabel(i, v)}
                    onRemove={() => removeOption(i)}
                    onMoveUp={() => moveOption(i, -1)}
                    onMoveDown={() => moveOption(i, 1)}
                    onToggleCorrect={() => toggleCorrect(i)}
                  />
                ))}
              </div>
              {!isTrueFalse && options.length < 6 && (
                <button
                  type="button"
                  onClick={addOption}
                  className="mt-2 flex items-center gap-1 text-sm text-brand-400 hover:text-brand-300 transition-colors"
                >
                  <Plus size={14} /> Add option
                </button>
              )}
              {type === 'order_items' && (
                <p className="mt-2 text-xs text-gray-500">The order shown above is treated as the correct order.</p>
              )}
            </div>
          )}

          {/* Closest number */}
          {type === 'closest_number' && (
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Target Number"
                type="number"
                placeholder="e.g. 206"
                value={numTarget}
                onChange={(e) => setNumTarget(e.target.value)}
              />
              <Input
                label="Unit (optional)"
                placeholder="e.g. bones"
                value={numUnit}
                onChange={(e) => setNumUnit(e.target.value)}
                maxLength={40}
              />
            </div>
          )}

          {/* Open text */}
          {type === 'open_text' && (
            <Input
              label="Reference Answer (for host's reference)"
              placeholder="The Battle of Hastings"
              value={openRef}
              onChange={(e) => setOpenRef(e.target.value)}
              maxLength={300}
              hint="This is shown to the host during marking, not to teams."
            />
          )}

          {/* Meta fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-300 block mb-2">Difficulty</label>
              <div className="flex gap-2">
                {DIFFICULTIES.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDifficulty(d)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border capitalize transition-colors
                      ${difficulty === d
                        ? d === 'easy' ? 'bg-emerald-900/40 border-emerald-700 text-emerald-300'
                          : d === 'medium' ? 'bg-yellow-900/40 border-yellow-700 text-yellow-300'
                          : 'bg-red-900/40 border-red-700 text-red-300'
                        : 'bg-gray-900 border-gray-700 text-gray-500 hover:border-gray-600'}`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-300 block mb-2">Category</label>
              <select
                className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white text-sm focus:outline-none focus:border-brand-500"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}>
                <option value="">No category</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Time Limit (seconds, optional)"
              type="number"
              placeholder="30"
              value={timeLimit}
              onChange={(e) => setTimeLimit(e.target.value)}
              min={5}
              max={300}
              hint="Leave blank to use session default"
            />
            <Input
              label="Points Value (optional)"
              type="number"
              placeholder="100"
              value={points}
              onChange={(e) => setPoints(e.target.value)}
              min={0}
              hint="Leave blank to use session default"
            />
          </div>

          <Input
            label="Media URL (optional)"
            placeholder="https://example.com/image.jpg"
            value={mediaUrl}
            onChange={(e) => setMediaUrl(e.target.value)}
          />

          <div>
            <label className="text-sm font-medium text-gray-300 block mb-2">Explanation (optional)</label>
            <textarea
              className="w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 text-white resize-none focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
              rows={2}
              placeholder="Shown after the answer is revealed…"
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              maxLength={500}
            />
          </div>

          {error && (
            <div className="bg-red-900/20 border border-red-800 rounded-xl px-4 py-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3 justify-end pt-2">
            <Button variant="secondary" onClick={() => navigate('/questions')}>Cancel</Button>
            <Button icon={Save} loading={saving} onClick={handleSave}>Save Question</Button>
          </div>
        </div>
      </div>
    </Layout>
  )
}

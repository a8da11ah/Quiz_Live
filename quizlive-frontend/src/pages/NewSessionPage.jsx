import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckSquare, Square, Search, Save } from 'lucide-react'
import { createSession, getQuestions, getCategories } from '../lib/api.js'
import Button from '../components/common/Button.jsx'
import Input  from '../components/common/Input.jsx'
import Layout from '../components/common/Layout.jsx'
import Badge  from '../components/common/Badge.jsx'

const SCORING_MODES = [
  { value: 'standard',    label: 'Standard',     desc: 'Fixed points per correct answer' },
  { value: 'speed_bonus', label: 'Speed Bonus',  desc: 'Extra points for answering fast' },
  { value: 'streak',      label: 'Streak',       desc: 'Multiplier for consecutive correct answers' },
  { value: 'elimination', label: 'Elimination',  desc: 'Wrong answer = team eliminated' },
]

const TYPE_LABELS = {
  multiple_choice: 'MC', true_false: 'T/F', multiple_select: 'Multi',
  closest_number: 'Num', order_items: 'Order', open_text: 'Text',
}

export default function NewSessionPage() {
  const navigate = useNavigate()

  const [name,        setName]        = useState('')
  const [scoringMode, setScoringMode] = useState('standard')
  const [selectedIds, setSelectedIds] = useState([])
  const [questions,   setQuestions]   = useState([])
  const [categories,  setCategories]  = useState([])
  const [search,      setSearch]      = useState('')
  const [catFilter,   setCatFilter]   = useState('')
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState('')

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

  const toggleAll = () => {
    if (filtered.every((q) => selectedIds.includes(q.id))) {
      setSelectedIds((prev) => prev.filter((id) => !filtered.find((q) => q.id === id)))
    } else {
      const newIds = filtered.map((q) => q.id).filter((id) => !selectedIds.includes(id))
      setSelectedIds((prev) => [...prev, ...newIds])
    }
  }

  const handleSave = async () => {
    setError('')
    if (!name.trim()) return setError('Session name is required.')
    if (selectedIds.length === 0) return setError('Select at least one question.')

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
      setError(e.message || 'Failed to create session.')
    } finally {
      setSaving(false)
    }
  }

  const allFilteredSelected = filtered.length > 0 && filtered.every((q) => selectedIds.includes(q.id))

  return (
    <Layout>
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white">New Session</h1>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => navigate('/sessions')}>Cancel</Button>
            <Button icon={Save} loading={saving} onClick={handleSave}>
              Create Session
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          {/* Name */}
          <Input
            label="Session Name"
            placeholder="e.g. Friday Night Quiz"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
          />

          {/* Scoring mode */}
          <div>
            <label className="text-sm font-medium text-gray-300 block mb-2">Scoring Mode</label>
            <div className="grid grid-cols-2 gap-3">
              {SCORING_MODES.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setScoringMode(m.value)}
                  className={`text-left px-4 py-3 rounded-xl border transition-colors
                    ${scoringMode === m.value
                      ? 'bg-brand-900/40 border-brand-700'
                      : 'bg-gray-900 border-gray-700 hover:border-gray-600'}`}
                >
                  <p className={`font-medium text-sm ${scoringMode === m.value ? 'text-brand-300' : 'text-white'}`}>{m.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{m.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Question picker */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-gray-300">
                Questions
                {selectedIds.length > 0 && (
                  <span className="ml-2 text-brand-400 font-bold">{selectedIds.length} selected</span>
                )}
              </label>
              <button
                type="button"
                onClick={toggleAll}
                className="text-xs text-gray-400 hover:text-white transition-colors"
              >
                {allFilteredSelected ? 'Deselect all' : 'Select all'}
              </button>
            </div>

            {/* Filters */}
            <div className="flex gap-2 mb-3">
              <div className="relative flex-1">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-gray-900 border border-gray-700 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-brand-500"
                  placeholder="Search…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <select
                className="px-3 py-1.5 rounded-lg bg-gray-900 border border-gray-700 text-sm text-white focus:outline-none focus:border-brand-500"
                value={catFilter}
                onChange={(e) => setCatFilter(e.target.value)}>
                <option value="">All categories</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
              </select>
            </div>

            {filtered.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-8 border border-dashed border-gray-800 rounded-xl">
                {questions.length === 0 ? 'No questions in library yet.' : 'No questions match your filter.'}
              </p>
            ) : (
              <div className="flex flex-col gap-1.5 max-h-[400px] overflow-y-auto pr-1">
                {filtered.map((q) => {
                  const selected = selectedIds.includes(q.id)
                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => toggleQuestion(q.id)}
                      className={`flex items-center gap-3 text-left px-3 py-2.5 rounded-xl border transition-colors
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

import { useEffect, useState } from 'react'
import { Plus, Search, BookOpen } from 'lucide-react'
import { getQuestions, getCategories, deleteQuestion } from '../lib/api.js'
import Button from '../components/common/Button.jsx'
import QuestionCard from '../components/host/QuestionCard.jsx'
import { useNavigate } from 'react-router-dom'

const TYPES = ['', 'multiple_choice', 'true_false', 'multiple_select', 'closest_number', 'order_items', 'open_text']
const DIFFS = ['', 'easy', 'medium', 'hard']

export default function Questions() {
  const navigate = useNavigate()
  const [questions,   setQuestions]   = useState([])
  const [categories,  setCategories]  = useState([])
  const [search,      setSearch]      = useState('')
  const [type,        setType]        = useState('')
  const [difficulty,  setDifficulty]  = useState('')
  const [categoryId,  setCategoryId]  = useState('')
  const [loading,     setLoading]     = useState(true)

  const load = () => {
    setLoading(true)
    getQuestions({ q: search || undefined, type: type || undefined, difficulty: difficulty || undefined, category_id: categoryId || undefined })
      .then(setQuestions)
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { getCategories().then(setCategories).catch(() => {}) }, [])
  useEffect(() => { load() }, [search, type, difficulty, categoryId])

  const handleDelete = async (q) => {
    if (!confirm(`Delete "${q.title}"?`)) return
    await deleteQuestion(q.id).catch((e) => alert(e.message))
    load()
  }

  return (
    <div className="min-h-screen bg-gray-950 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <BookOpen className="text-brand-400" size={22} />
            <h1 className="text-2xl font-bold text-white">Question Library</h1>
            <span className="ml-2 text-sm text-gray-500">{questions.length} questions</span>
          </div>
          <Button icon={Plus} onClick={() => navigate('/questions/new')}>New Question</Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              className="pl-8 pr-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-brand-500"
              placeholder="Search questions…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-sm text-white focus:outline-none focus:border-brand-500"
            value={type} onChange={(e) => setType(e.target.value)}>
            {TYPES.map((t) => <option key={t} value={t}>{t || 'All types'}</option>)}
          </select>
          <select
            className="px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-sm text-white focus:outline-none focus:border-brand-500"
            value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
            {DIFFS.map((d) => <option key={d} value={d}>{d || 'All difficulties'}</option>)}
          </select>
          <select
            className="px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-sm text-white focus:outline-none focus:border-brand-500"
            value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">All categories</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </select>
        </div>

        {/* List */}
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading…</div>
        ) : questions.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-gray-800 rounded-2xl">
            <BookOpen size={40} className="text-gray-700 mx-auto mb-3" />
            <p className="text-gray-500 mb-3">No questions found</p>
            <Button icon={Plus} size="sm" onClick={() => navigate('/questions/new')}>Create a question</Button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {questions.map((q) => (
              <QuestionCard
                key={q.id}
                question={q}
                onEdit={(q) => navigate(`/questions/${q.id}/edit`)}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

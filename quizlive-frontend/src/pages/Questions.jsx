import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, BookOpen, Upload } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { getQuestions, getCategories, deleteQuestion } from '../lib/api.js'
import Button from '../components/common/Button.jsx'
import QuestionCard from '../components/host/QuestionCard.jsx'
import Layout from '../components/common/Layout.jsx'
import ImportQuestionsModal from '../components/host/ImportQuestionsModal.jsx'

const TYPE_VALUES = ['', 'multiple_choice', 'true_false', 'multiple_select', 'closest_number', 'order_items', 'open_text']
const DIFF_VALUES = ['', 'easy', 'medium', 'hard']

export default function Questions() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [questions,   setQuestions]   = useState([])
  const [categories,  setCategories]  = useState([])
  const [search,      setSearch]      = useState('')
  const [type,        setType]        = useState('')
  const [difficulty,  setDifficulty]  = useState('')
  const [categoryId,  setCategoryId]  = useState('')
  const [loading,     setLoading]     = useState(true)
  const [showImport,  setShowImport]  = useState(false)

  const load = () => {
    setLoading(true)
    getQuestions({
      q: search || undefined,
      type: type || undefined,
      difficulty: difficulty || undefined,
      category_id: categoryId || undefined,
    })
      .then(setQuestions)
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { getCategories().then(setCategories).catch(() => {}) }, [])
  useEffect(() => { load() }, [search, type, difficulty, categoryId]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleDelete = async (q) => {
    if (!confirm(`${t('common.delete')} "${q.title}"?`)) return
    await deleteQuestion(q.id).catch((e) => alert(e.message))
    load()
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <BookOpen className="text-brand-400" size={22} />
            <h1 className="text-2xl font-bold text-white">{t('questions.title')}</h1>
            <span className="ms-2 text-sm text-gray-500">
              {t('questions.count', { count: questions.length })}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" icon={Upload} onClick={() => setShowImport(true)}>
              {t('questions.importJson')}
            </Button>
            <Button icon={Plus} onClick={() => navigate('/questions/new')}>{t('questions.new')}</Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative">
            <Search size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              className="ps-8 pe-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-brand-500"
              placeholder={t('common.search')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-sm text-white focus:outline-none focus:border-brand-500"
            value={type} onChange={(e) => setType(e.target.value)}>
            {TYPE_VALUES.map((v) => (
              <option key={v} value={v}>
                {v ? t(`questions.types.${v}`) : t('questions.allTypes')}
              </option>
            ))}
          </select>
          <select
            className="px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-sm text-white focus:outline-none focus:border-brand-500"
            value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
            {DIFF_VALUES.map((d) => (
              <option key={d} value={d}>
                {d ? t(`questions.difficulty.${d}`) : t('questions.allDifficulties')}
              </option>
            ))}
          </select>
          <select
            className="px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-sm text-white focus:outline-none focus:border-brand-500"
            value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">{t('sessions.allCategories')}</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </select>
        </div>

        {/* List */}
        {loading ? (
          <div className="text-center py-12 text-gray-500">{t('common.loading')}</div>
        ) : questions.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-gray-800 rounded-2xl">
            <BookOpen size={40} className="text-gray-700 mx-auto mb-3" />
            <p className="text-gray-500 mb-3">{t('questions.noQuestionsFound')}</p>
            <Button icon={Plus} size="sm" onClick={() => navigate('/questions/new')}>
              {t('questions.createQuestion')}
            </Button>
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
      {showImport && (
        <ImportQuestionsModal
          onClose={() => setShowImport(false)}
          onImported={() => { load(); setShowImport(false) }}
        />
      )}
    </Layout>
  )
}

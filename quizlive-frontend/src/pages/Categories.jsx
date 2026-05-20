import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, FolderOpen } from 'lucide-react'
import { getCategories, createCategory, updateCategory, deleteCategory } from '../lib/api.js'
import Button from '../components/common/Button.jsx'
import Input  from '../components/common/Input.jsx'
import Modal  from '../components/common/Modal.jsx'

const PRESET_COLORS = ['#6557fb','#e85d24','#10b981','#f59e0b','#ec4899','#06b6d4','#8b5cf6','#64748b']

function CategoryForm({ initial = {}, onSave, loading }) {
  const [name,  setName]  = useState(initial.name  || '')
  const [icon,  setIcon]  = useState(initial.icon  || '📚')
  const [color, setColor] = useState(initial.color || PRESET_COLORS[0])

  return (
    <div className="flex flex-col gap-4">
      <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Science" maxLength={50} />
      <Input label="Icon (emoji)" value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="📚" maxLength={4} />
      <div>
        <label className="text-sm font-medium text-gray-300 block mb-2">Color</label>
        <div className="flex flex-wrap gap-2">
          {PRESET_COLORS.map((c) => (
            <button key={c} type="button" onClick={() => setColor(c)}
              className={`w-7 h-7 rounded-full transition-transform ${color === c ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-gray-900' : ''}`}
              style={{ backgroundColor: c }} />
          ))}
        </div>
      </div>
      <Button loading={loading} onClick={() => onSave({ name, icon, color })} className="w-full">Save</Button>
    </div>
  )
}

export default function Categories() {
  const [categories, setCategories] = useState([])
  const [modal, setModal] = useState(null)   // null | 'create' | category object
  const [saving, setSaving] = useState(false)

  const load = () => getCategories().then(setCategories).catch(() => {})

  useEffect(() => { load() }, [])

  const handleSave = async (body) => {
    setSaving(true)
    try {
      if (modal === 'create') await createCategory(body)
      else await updateCategory(modal.id, body)
      setModal(null)
      load()
    } catch (e) {
      alert(e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (cat) => {
    if (!confirm(`Delete "${cat.name}"?`)) return
    await deleteCategory(cat.id).catch((e) => alert(e.message))
    load()
  }

  return (
    <div className="min-h-screen bg-gray-950 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <FolderOpen className="text-brand-400" size={22} />
            <h1 className="text-2xl font-bold text-white">Categories</h1>
          </div>
          <Button icon={Plus} onClick={() => setModal('create')}>New Category</Button>
        </div>

        {categories.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-gray-800 rounded-2xl">
            <FolderOpen size={40} className="text-gray-700 mx-auto mb-3" />
            <p className="text-gray-500">No categories yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {categories.map((cat) => (
              <div key={cat.id}
                className="flex items-center gap-3 bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 group hover:border-gray-700 transition-colors">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center text-xl"
                  style={{ backgroundColor: cat.color + '33' }}>
                  {cat.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white truncate">{cat.name}</p>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => setModal(cat)}
                    className="p-1.5 rounded-lg text-gray-500 hover:text-brand-400 hover:bg-brand-900/30 transition-colors">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => handleDelete(cat)}
                    className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-900/30 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={!!modal} onClose={() => setModal(null)}
        title={modal === 'create' ? 'New Category' : `Edit — ${modal?.name}`}>
        {modal && (
          <CategoryForm
            initial={modal === 'create' ? {} : modal}
            onSave={handleSave}
            loading={saving}
          />
        )}
      </Modal>
    </div>
  )
}

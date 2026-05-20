import { useTranslation } from 'react-i18next'
import { Languages } from 'lucide-react'

/**
 * Compact language switcher.  Renders a small pill button that toggles
 * between English and Arabic.  RTL switching is handled by i18n.js on
 * the documentElement.
 */
export default function LanguageSwitcher({ className = '' }) {
  const { i18n } = useTranslation()
  const current  = i18n.language?.startsWith('ar') ? 'ar' : 'en'
  const next     = current === 'ar' ? 'en' : 'ar'

  return (
    <button
      type="button"
      onClick={() => i18n.changeLanguage(next)}
      title={next === 'ar' ? 'العربية' : 'English'}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg
                  bg-gray-800/60 hover:bg-gray-700 border border-gray-700
                  text-gray-300 hover:text-white text-xs font-medium
                  transition-colors ${className}`}
    >
      <Languages size={13} />
      <span>{next === 'ar' ? 'العربية' : 'English'}</span>
    </button>
  )
}

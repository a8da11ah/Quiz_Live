import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import en from './locales/en.json'
import ar from './locales/ar.json'

export const SUPPORTED_LANGS = ['en', 'ar']
export const RTL_LANGS = ['ar']

function applyDir(lang) {
  const dir = RTL_LANGS.includes(lang) ? 'rtl' : 'ltr'
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('dir', dir)
    document.documentElement.setAttribute('lang', lang)
  }
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      ar: { translation: ar },
    },
    fallbackLng: 'en',
    supportedLngs: SUPPORTED_LANGS,
    interpolation: { escapeValue: false }, // React already escapes
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      lookupLocalStorage: 'quizlive_lang',
      caches: ['localStorage'],
    },
  })
  .then(() => applyDir(i18n.language))

i18n.on('languageChanged', applyDir)

export default i18n

import { useEffect, useState } from 'react'
import { getMe, getSettings, logout, saveLang } from './api.js'
import App from './App.jsx'
import AuthPage from './components/AuthPage.jsx'
import { setLang as i18nSetLang, useI18n } from './i18n.js'

// Shows the login page until there is a logged-in user, then the app. A 401 anywhere sends the user back to login.
// The language is loaded first, so the login page is already in the language the merchant chose.
export default function Gate() {
  const [user, setUser] = useState(undefined)   // undefined = still checking
  const [lang, setLang] = useState('en-IN')
  useI18n()
  useEffect(() => {
    getSettings().then((s) => { if (s.lang) { setLang(s.lang); i18nSetLang(s.lang) } }).catch(() => {})
    getMe().then(setUser).catch(() => setUser(null))
    const out = () => setUser(null)
    window.addEventListener('auth-expired', out)
    return () => window.removeEventListener('auth-expired', out)
  }, [])
  const pickLang = (code) => { setLang(code); i18nSetLang(code); saveLang(code).catch(() => {}) }
  if (user === undefined) return null
  if (!user) return <AuthPage onUser={setUser} lang={lang} onLang={pickLang} />
  return <App key={user.id} user={user} onLogout={() => logout().finally(() => setUser(null))} />
}

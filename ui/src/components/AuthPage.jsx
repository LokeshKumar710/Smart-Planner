import { useState } from 'react'
import { login, signup } from '../api.js'
import Icon from './Icon.jsx'
import { LANGS } from '../languages.js'
import { T, t, td } from '../i18n.js'

// Same picture as the Home banner: busy hours rising to a peak.
function Art() {
  const heights = [46, 74, 62, 98, 126, 112, 78, 52]
  const bars = heights.map((h, i) => ({ x: 14 + i * 40, h, peak: [3, 4, 5].includes(i) }))
  const line = bars.map((b) => `${b.x + 14},${176 - b.h - 14}`).join(' ')
  return (
    <svg className="authart" viewBox="0 0 340 190" aria-hidden="true" focusable="false">
      <circle cx="292" cy="40" r="46" fill="#00BAF2" opacity=".16" />
      <circle cx="292" cy="40" r="26" fill="#00BAF2" />
      {bars.map((b) => <rect key={b.x} x={b.x} y={176 - b.h} width="28" height={b.h} rx="9" fill={b.peak ? '#00BAF2' : '#FFFFFF'} opacity={b.peak ? 0.95 : 0.2} />)}
      <polyline points={line} fill="none" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" opacity=".7" />
      {bars.map((b) => <circle key={'d' + b.x} cx={b.x + 14} cy={176 - b.h - 14} r="4.5" fill="#fff" />)}
      <rect x="6" y="178" width="328" height="3" rx="1.5" fill="#fff" opacity=".28" />
    </svg>
  )
}

const POINTS = [
  ['plan', T('What to make today, from weather and festivals')],
  ['trend', T('Your busiest hours, from your own payments')],
  ['bell', T("Tomorrow's plan every evening, in your language")],
]

// Login and sign up: a navy brand panel beside the form, like the rest of the app. Success hands the user to the app.
export default function AuthPage({ onUser, lang, onLang }) {
  const [mode, setMode] = useState('login')
  const [f, setF] = useState({ name: '', email: '', password: '' })
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const up = mode === 'signup'
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const pick = (m) => { setMode(m); setError('') }

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      onUser(up ? await signup(f) : await login(f))
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="authpage">
      <aside className="authbrand">
        <div className="authlogo"><Icon name="plan" size={22} /><b>{t('Smart Planner')}</b></div>
        <div className="authpitch">
          <h1>{t('Plan your stall, sell smarter.')}</h1>
          <p>{t('Know what to make, how much, and when you will be busiest.')}</p>
          <ul>
            {POINTS.map(([icon, text]) => <li key={icon}><span><Icon name={icon} size={16} /></span>{t(text)}</li>)}
          </ul>
        </div>
        <Art />
      </aside>

      <main className="authside">
        <label className="langpick authlang">
          <Icon name="globe" size={17} />
          <select value={lang} onChange={(e) => onLang(e.target.value)} aria-label={t('Language')}>
            {LANGS.map(([v, n]) => <option key={v} value={v}>{n}</option>)}
          </select>
        </label>
        <form className="authcard" onSubmit={submit}>
          <div className="authtabs" role="tablist">
            <button type="button" role="tab" aria-selected={!up} className={!up ? 'on' : ''} onClick={() => pick('login')}>{t('Log in')}</button>
            <button type="button" role="tab" aria-selected={up} className={up ? 'on' : ''} onClick={() => pick('signup')}>{t('Sign up')}</button>
          </div>
          <h2>{up ? t('Create your account') : t('Welcome back')}</h2>
          <p className="sub">{up ? t('Sign up to plan your stall.') : t('Log in to see your stall.')}</p>

          {up && (
            <label className="field"><span>{t('Your name')}</span>
              <input value={f.name} onChange={set('name')} autoComplete="name" required maxLength={60} /></label>
          )}
          <label className="field"><span>{t('Email')}</span>
            <input type="email" value={f.email} onChange={set('email')} autoComplete="email" required /></label>
          <label className="field"><span>{t('Password')}</span>
            <div className="pwrow">
              <input type={show ? 'text' : 'password'} value={f.password} onChange={set('password')} autoComplete={up ? 'new-password' : 'current-password'} required minLength={up ? 6 : undefined} />
              <button type="button" className="linkbtn" onClick={() => setShow((v) => !v)}>{show ? t('Hide') : t('Show')}</button>
            </div>
            {up && <small>{t('At least 6 characters.')}</small>}</label>

          {error && <p className="err authrr" role="alert"><Icon name="alert" size={15} />{' '}{td(error)}</p>}
          <button className="primary" type="submit" disabled={busy}>
            {busy ? t('Please wait…') : <>{up ? t('Create account') : t('Log in')}{' '}<Icon name="right" size={16} /></>}
          </button>
          <p className="authswitch">
            {up ? t('Already have an account?') : t('New here?')}{' '}
            <button type="button" className="linkbtn" onClick={() => pick(up ? 'login' : 'signup')}>{up ? t('Log in') : t('Sign up')}</button>
          </p>
        </form>
      </main>
    </div>
  )
}

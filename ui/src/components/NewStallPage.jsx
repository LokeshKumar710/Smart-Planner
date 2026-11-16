import { useState } from 'react'
import { recommendStall } from '../api.js'
import { catLabel, clock12 } from '../stall.js'
import LocationPicker from './LocationPicker.jsx'
import Icon from './Icon.jsx'
import { T, t, td } from '../i18n.js'

const SHOPS = [
  ['beverages', T('Beverages'), T('Tea, coffee, juice, lassi, soda')],
  ['snacks', T('Snacks and fast food'), T('Samosa, vada pav, pakora, rolls')],
  ['meals', T('Meals and tiffin'), T('Biryani, thali, dosa, rice')],
  ['sweets', T('Sweets and desserts'), T('Jalebi, kulfi, laddu, ice cream')],
  ['mixed', T('A bit of everything'), T('Drinks, snacks, meals and sweets')],
]
const hr = (h) => `${(h % 12) || 12} ${h % 24 < 12 ? 'am' : 'pm'}`

// For a new merchant: pick the kind of shop and the place, get a starter menu, quantities, hours and busiest time.
export default function NewStallPage({ lang, savedLocation, onUse }) {
  const [shop, setShop] = useState('')
  const [location, setLocation] = useState(savedLocation || null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [rec, setRec] = useState(null)

  async function go(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      setRec(await recommendStall({ shop_type: shop, location, lang }))
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="saved">
      <form className="card form" onSubmit={go}>
        <h2>{t('What kind of stall do you want to start?')}</h2>
        <p className="sub">{t('Choose the type of shop and where it will be. You do not need any sales history.')}</p>
        <div className="shoptypes" role="radiogroup" aria-label={t('Type of shop')}>
          {SHOPS.map(([v, name, eg]) => (
            <button key={v} type="button" role="radio" aria-checked={shop === v} className={'shoptype' + (shop === v ? ' on' : '')} onClick={() => setShop(v)}>
              <b>{t(name)}</b><small>{t(eg)}</small>
            </button>
          ))}
        </div>
        <LocationPicker value={location} onChange={setLocation} />
        {error && <p className="err" role="alert">{td(error)}</p>}
        <button className="primary" type="submit" disabled={!shop || !location || busy}>
          {busy ? t('Preparing your recommendation…') : <>{t('Recommend for my stall')}{' '}<Icon name="right" size={16} /></>}
        </button>
      </form>

      {rec && (
        <section className="card result">
          <h2>{t('Recommended for your {0} stall', t(rec.label))}</h2>
          <div className="chiprow">
            <span className="chip wxchip"><Icon name="pin" size={14} /> {rec.place.name}</span>
            <span className="chip wxchip"><Icon name="thermo" size={14} /> {Math.round(rec.weather.max_c)}°C · {t('{0}% chance of rain', rec.weather.rain_pct)}</span>
            {rec.events.map((e) => <span key={e.name} className="chip evgreen">{e.name}</span>)}
          </div>

          {rec.message && <p className="msg">{rec.message_local || rec.message}</p>}

          <div className="revbox">
            <div><small>{t('Suggested hours')}</small><b>{clock12(rec.open)} – {clock12(rec.close)}</b></div>
            <div><small>{t('Busiest time')}</small><b>{hr(rec.peak.start)} – {hr(rec.peak.end)}</b></div>
            <div><small>{t('Possible daily sales')}</small><b>₹{rec.revenue.low.toLocaleString('en-IN')} – ₹{rec.revenue.high.toLocaleString('en-IN')}</b></div>
          </div>

          <table className="picktable recitems">
            <thead><tr><th>{t('Item')}</th><th>{t('Category')}</th><th className="num">{t('Price (₹)')}</th><th className="num">{t('Make daily')}</th></tr></thead>
            <tbody>
              {rec.items.map((i) => (
                <tr key={i.name}>
                  <td><b>{i.name}</b>{i.top && <>{' '}<span className="pill top">{t('Start with this')}</span></>}<small className="done-tag">{td(i.why)}</small></td>
                  <td>{catLabel(i.category)}</td>
                  <td className="num">{i.price}</td>
                  <td className="num"><b>{i.make}</b></td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="sub">
            {t('These are starter estimates from weather, the festival calendar and a typical street-stall pattern, not your own sales. Count your items every day and the plan will learn from them.')}
            {!rec.ai_menu && ' ' + t('The item list is a standard starter menu because suggestions were not available right now.')}
          </p>
          <div className="footbar">
            <span />
            <button type="button" className="primary inline" onClick={() => onUse(rec, location)}>
              {t('Use this menu')}{' '}<Icon name="right" size={16} />
            </button>
          </div>
        </section>
      )}
    </div>
  )
}

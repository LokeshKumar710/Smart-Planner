Smart Planner, an AI business partner for street-food stalls

Smart Planner  helps small food-stall owners decide **what to make, how much, and when they will be busiest**, and helps **new merchants** decide what to sell before they open. It speaks the merchant's language (English, Hindi, Telugu), reads menus from photos, listens to spoken counts, and reminds them every evening about tomorrow.



## Features

| Area | What it does |
|---|---|
| **Start a Stall** (new merchants) | Pick a shop type (beverages, snacks, meals, sweets or a mix) and a location. Get a ranked starter menu with prices and categories, quantities to make, suggested opening hours, the busiest time and a possible daily sales range. One click sends the menu to the Review page. |
| **Menu** | Add items by typing, speaking, or photographing a handwritten menu or price board. Each item has a **category** (hot drinks, cold drinks, fried snacks, meals, sweets, other), filled in automatically and editable. Items can have their own selling hours. |
| **Today's Plan** | Quantities per item and part of the day, the busiest window, and a short message in the merchant's language. Adjusted for the hourly weather forecast, festivals, weekends and sudden events. |
| **Daily Counts** | Say or type what you made and what is left. The planner learns from real sell-through, including days it sold out. |
| **Payments and Analytics** | Upload payment history (time and amount). Busy hours are measured per hour, and the lift from festivals, holidays and weather is measured from your own data. A lift is only used once the data supports it. |
| **Sudden events** | Add a bandh, strike or road closure by hand, or let the app suggest events from local news. Suggestions never change the plan until you accept them. |
| **Notifications** | Every evening at 8 pm, tomorrow's plan is written, translated and spoken aloud. It stays playable until the day is over. |
| **Languages** | Interface, messages and speech in English, Hindi and Telugu, switchable from the top bar or the login page. |

## How it works

The rule that runs through the whole project: **code does all the arithmetic, models only read and write.** No quantity or number is ever invented by a language model.

- **Sarvam Gemma 4** reads menu photos and tidies typed items.
- **Sarvam Prism** gives each item a category with a calibrated probability. Low confidence falls back to "other".
- **Code** computes quantities from weather, the festival calendar, weekday, payment history and daily counts.
- **Sarvam-105B** writes the short messages and suggests item names for new stalls. Items it suggests are validated, and a built-in starter menu is used if it is unavailable.
- **Mayura / Sarvam-Translate** localise messages. **Saaras** transcribes speech. **Bulbul** speaks.
- **Open-Meteo** supplies weather and place search (no key needed).

For a brand-new stall there is no history, so every number is labelled a **starter estimate**. As payments and counts arrive, the plan switches to what the stall's own data says, hour by hour.

## Tech stack

- **Backend:** Python 3.10+ standard-library HTTP server and SQLite. No web framework.
- **Frontend:** React 18 and Vite.
- **AI:** Sarvam AI API.

## Getting started

### Prerequisites

- Python 3.10 or newer
- Node.js 18 or newer
- A [Sarvam AI](https://dashboard.sarvam.ai) API key

### 1. Install

```bash
git clone <your-repository-url>
cd Paytm-Ai-Hackathon

pip install -r requirements.txt

cd ui
npm install
npm run build
cd ..
```

### 2. Configure

```bash
cp .env.example .env
```

Edit `.env`:

```
SARVAM_API_KEY=your_key_here
# Optional: lets the app check local news for a bandh, strike or road closure (free key from gnews.io)
GNEWS_API_KEY=
```

The key stays on the server and the browser never sees it. `.env` is git-ignored.

### 3. Run

```bash
python server.py
```

Open <http://localhost:8000>, then sign up to create your account.

### Frontend development

```bash
python server.py        # API on :8000
cd ui && npm run dev    # hot-reloading UI on :5173, proxies /api to :8000
```

## Project structure

```
Paytm-Ai-Hackathon/
server.py                 HTTP server, routes and login check
smart_stall/
  auth.py                 sign up, log in, sessions (salted scrypt hashes, HttpOnly cookie)
  newstall.py             recommendations for new merchants
  stallplan.py            the planner: items, categories, quantities, peak hours, messages
  categories.py           menu item categories
  store.py                saved menu details
  counts.py               daily made / left counts
  transactions.py         payment history
  analytics.py            busy hours and measured calendar / weather lifts
  events.py               2026 festival and holiday calendar
  special.py              sudden events and news suggestions
  forecast.py             weather
  notifier.py             8 pm daily notification, speech, history
  places.py               location search
  i18n.py                 UI translation with caching and validation
  clients.py              Sarvam API client
  db.py                   SQLite storage (data/stall.db)
ui/                       React app (src/components, src/api.js, theme.css)
tools/extract_strings.cjs collects every UI string for translation
data/                     runtime data (git-ignored) and sample_payments.csv
demo.py                   command-line demo of the planner
smoke_test.py             calls each Sarvam model once to check access
```


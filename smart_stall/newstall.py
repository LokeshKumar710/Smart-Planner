"""Guide for NEW merchants who want to start a food stall.

The merchant gives the kind of shop (beverages, snacks, meals, sweets or a mix) and where it will be.
We recommend what to sell, a price, how much to make, opening hours and the busiest time.

Who does what (same rule as the planner, so numbers are never invented by an LLM):
  * Sarvam-105B suggests item NAMES and typical prices that suit the shop type and the place.
    If it is unavailable, a built-in starter menu is used instead.
  * Code does ALL the arithmetic: weather and festival lifts, units to make, revenue estimate, peak hours.
  * Sarvam-105B then words a short note from those facts, and Mayura/Sarvam-Translate localises it.
There is no sales history for a new stall, so every number here is a STARTER ESTIMATE and is labelled as one."""
import datetime as dt
from concurrent.futures import ThreadPoolExecutor

from . import clients as c, events as cal, forecast as f, stallplan as sp
from .config import M

# Shop type -> (label, the item categories it sells, default opening hours).
SHOP_TYPES = {
    "beverages": ("Beverages", ["hot_drink", "cold_drink"], ("07:00", "21:00")),
    "snacks": ("Snacks and fast food", ["fried_snack", "meal"], ("16:00", "22:00")),
    "meals": ("Meals and tiffin", ["meal"], ("11:00", "15:00")),
    "sweets": ("Sweets and desserts", ["sweet", "cold_drink"], ("10:00", "21:00")),
    "mixed": ("A bit of everything", ["hot_drink", "cold_drink", "fried_snack", "meal", "sweet"], ("08:00", "22:00")),
}
ITEMS_PER_CATEGORY = {1: 8, 2: 4, 5: 2}   # how many suggestions to ask for, by number of categories
NEW_STALL_FACTOR = 0.7                    # a new stall has no regulars yet: start below an established stall

# Used only when the model cannot be reached: (name, price in rupees).
STARTER_MENU = {
    "hot_drink": [("Masala chai", 10), ("Coffee", 15), ("Hot milk", 15), ("Tomato soup", 30)],
    "cold_drink": [("Lassi", 30), ("Fresh lime soda", 20), ("Cold coffee", 40), ("Buttermilk", 15)],
    "fried_snack": [("Samosa", 15), ("Vada pav", 20), ("Onion pakora", 30), ("Mirchi bajji", 20)],
    "meal": [("Veg biryani", 90), ("Egg fried rice", 80), ("Masala dosa", 60), ("Veg sandwich", 40)],
    "sweet": [("Jalebi", 20), ("Gulab jamun", 25), ("Kulfi", 30), ("Laddu", 15)],
}

ASK = ("A new merchant wants to start a street food stall.\nShop type: {kind}.\nLocation: {place}.\n"
       "Weather today: about {temp} degrees, {rain}% chance of rain.\n\n"
       "Suggest {n} items that suit this shop type and this part of India. Use ONLY these category keys: {cats}. "
       'Return ONLY a JSON array like [{{"name":"Masala chai","category":"hot_drink","price":10}}] where price is '
       "a typical street-stall selling price in rupees. Prefer items that are quick to make and cheap to stock. "
       "No duplicates, no brand names.")


def _suggest(kind, place, wx, cats):
    """[(name, category, price)] from the model, or [] if it fails. Everything is validated."""
    n = ITEMS_PER_CATEGORY.get(len(cats), 8)
    n = min(10, n * len(cats))
    try:
        raw = c.chat(ASK.format(kind=kind, place=place, temp=round(wx["max_c"]), rain=wx["rain_pct"], n=n,
                                cats=", ".join(cats)), model=M["chat"], max_tokens=900)
    except Exception:
        return []
    out, seen = [], set()
    for d in sp._json_list(raw):
        name, cat = str(d["name"]).strip()[:40], d.get("category")
        if cat not in cats or name.lower() in seen:
            continue
        try:
            price = float(d["price"])
        except (KeyError, TypeError, ValueError):
            price = None
        if price is None or not 1 <= price <= 1000:
            price = sp.DEFAULT_PRICE[cat]
        seen.add(name.lower())
        out.append((name, cat, round(price)))
    return out


def _starter(cats):
    out = []
    for cat in cats:
        out += [(n, cat, p) for n, p in STARTER_MENU[cat]]
    return out


def _balance(items, cats):
    """Keep at most 4 of each category, so a mixed shop is not all one thing, and at most 10 in total."""
    per, out = {}, []
    for it in items:
        if per.get(it[1], 0) < (4 if len(cats) > 1 else 8):
            per[it[1]] = per.get(it[1], 0) + 1
            out.append(it)
    return out[:10]


def recommend(shop_type, location=None, lang="en-IN"):
    """The full recommendation for a new stall. Raises ValueError for a bad shop type."""
    if shop_type not in SHOP_TYPES:
        raise ValueError("Pick the type of shop you want to start.")
    label, cats, (open_s, close_s) = SHOP_TYPES[shop_type]
    here, default_place = sp.resolve_location(location)
    day = dt.date.today()
    wx = f.weather(here["lat"], here["lon"], day=0)
    evs = sp._events_on(day)
    hours = sp.open_hours(open_s, close_s)[0]
    swx = sp.slot_weather(wx, hours)

    suggested = _balance(_suggest(label, here["name"], swx, cats), cats)
    picks = suggested or _starter(cats)[:10]
    rows = []
    for name, cat, price in picks:
        wa, wwhy = sp.weather_adjust(cat, swx)
        ef, ewhy = cal.factor(cat, evs)
        units = sum(sp.UNITS_PER_WEIGHT[cat] * sp.HOUR_WEIGHT.get(h, 1) for h in hours) * wa * ef * NEW_STALL_FACTOR
        make = max(5, int(round(units / 5.0) * 5))
        rows.append({"name": name, "category": cat, "price": price, "make": make,
                     "revenue": make * price, "why": ", ".join(wwhy + ewhy) or "steady seller"})
    rows.sort(key=lambda r: -r["revenue"])
    for r in rows[:3]:
        r["top"] = True
    ps, pe = sp.peak_window(hours)
    revenue = sum(r["revenue"] for r in rows)
    # Low-high range, because a brand-new stall can land well above or below the typical curve.
    out = {"shop_type": shop_type, "label": label, "open": open_s, "close": close_s,
           "place": {"name": here["name"], "default": default_place}, "weather": swx,
           "events": evs, "items": rows, "peak": {"start": ps, "end": pe},
           "revenue": {"low": int(round(revenue * 0.6, -1)), "high": int(round(revenue * 1.1, -1))},
           "ai_menu": bool(suggested),
           "lang": lang, "basis": "starter"}
    out["message"], out["message_local"] = _message(out, lang)
    return out


def _message(rec, lang):
    top = ", ".join(r["name"] for r in rec["items"][:3])
    ev = "; ".join(f"{e['name']} is {e['when']}" for e in rec["events"]) or "no festival"
    facts = (f"Shop type: {rec['label']}. Place: {rec['place']['name']}.\nBest items to start with: {top}.\n"
             f"Busiest time: {sp._fmt_h(rec['peak']['start'])} to {sp._fmt_h(rec['peak']['end'])}.\n"
             f"Suggested hours: {sp._fmt_h(int(rec['open'][:2]))} to {sp._fmt_h(int(rec['close'][:2]))}.\n"
             f"Weather note: {sp._weather_line(rec['weather'])}\nCalendar: {ev}.")
    try:
        en = c.chat("Write exactly 3 short sentences for someone about to open a new food stall: (1) what to start with, "
                    "(2) the best hours to be open and when it is busiest, (3) the weather or festival tip. Use only the "
                    "facts below and keep every number as given.\n\n" + facts, model=M["chat"],
                    system="You are a friendly business partner for a small stall. Plain words, no markdown, no emojis.",
                    max_tokens=600).strip()
    except Exception:
        return "", ""
    try:
        return en, sp.localise(en, lang)
    except Exception:
        return en, ""

# Design decisions and assumptions

Short notes on the choices behind the estimator, so a reviewer can see the "why"
and not just the "what".

## 1. One pricing engine, used twice

`shared/pricing.js` is a pure function: `(plan, config) -> estimate`. The React
app imports it for the live estimate, and the API imports the same file when a
lead is submitted. The server **ignores any price the browser sends** and
recomputes from the current price list, so a tampered request can never store a
quote we did not give. Same code on both sides also means the number the family
saw is the number ops sees in the admin page.

## 2. Prices live in JSON, not in components

`config/pricing.json` holds per-city, per-service, per-shift day rates, add-ons,
GST, long-stay discounts and one-time fees. The web app fetches it from
`GET /api/config` at runtime, so a price change needs no rebuild or deploy.

Ops can change it two ways:

- edit the JSON file directly, or
- use the **Price list** tab in `/admin`, which edits the same file.

Either way the server runs `shared/config-schema.js` first. A missing rate, a
negative price, a typo in a service id or CGST + SGST not adding up to GST all
get rejected with a readable message, and the server refuses to start on a
broken file. Every save keeps the previous file in `config/history/`, and every
lead stores the price list version it was quoted on.

## 3. Money is whole rupees, rounded once per line

All amounts are integers. Discount and GST are rounded per line, so the
breakdown always adds up exactly to the total (there is a test that checks this
for several plans). GST is shown as CGST 9% + SGST 9% because home care is
delivered inside one state.

## 4. Live-in vs day shift

- **Day shift**: a caregiver works the chosen hours. 24h = two 12h shifts, so
  it costs roughly twice a 12h shift.
- **Live-in**: one caregiver stays at home with sleep and breaks. It is cheaper
  than 24h of shifts. Live-in is offered for 12h and 24h only; the 8h option is
  disabled with an explanation instead of silently failing.

Which combinations exist is decided by the config (a missing rate = not
offered), not by `if` statements in the UI.

## 5. Add-on quantities follow their unit

| Unit    | Quantity over the plan                        | Example                    |
|---------|-----------------------------------------------|----------------------------|
| `visit` | `round(days / 7 × visits per week)`, min 1    | Physio 3/week for 30 days = 13 visits |
| `month` | `ceil(days / 30)`                             | Hospital bed for 31 days = 2 months   |
| `day`   | `days`                                        | Meal preparation           |
| `once`  | `1`                                           | Lab sample collection      |

Each add-on lists which care types it applies to (a lactation consultant only
shows up for baby care). Switching care type drops add-ons that no longer apply.

## 6. Lead capture

- Validation rules live in `shared/lead.js` and run in the browser and again on
  the server. Errors are returned per field as codes (`required`, `invalid`) and
  translated in the UI, so the API never sends English-only messages.
- Indian mobiles are normalised to `+91XXXXXXXXXX` from common formats
  (`98100 12345`, `098100-12345`, `+91…`).
- Spam protection without a CAPTCHA: a hidden honeypot field and an IP rate
  limit (10 leads / 10 min).
- Each lead gets a short reference like `CP-1711-0033` that a family can read
  out on the phone.

## 7. Admin

- Simple login from environment variables, then a signed, expiring HMAC token
  (8 hours) kept in `sessionStorage`. Credential checks use constant-time
  comparison and login is rate limited.
- Leads can be searched and filtered by status, city and care type; the CSV
  export respects the same filters.
- CSV is written for Excel and Google Sheets: UTF-8 BOM (Hindi names survive),
  CRLF, quoted fields and **formula injection protection** (a note starting with
  `=` is exported as text, not run as a formula).
- Status pipeline (new → contacted → converted / lost), ops notes and one-tap
  Call / WhatsApp / Email from the lead drawer.

## 8. Phone first

Designed at 360px first. On phones the estimate becomes a sticky bottom bar with
the total that expands into the full breakdown. Inputs are 16px so iOS does not
zoom, tap targets are at least 38–46px, and there is no horizontal scroll.

## 9. Good-to-haves

- **Compare plans**: save any plan as A or B; the compare page re-prices both
  from the current price list, shows the monthly difference and highlights the
  rows that differ.
- **WhatsApp share**: a `wa.me` link with a short summary and a link that
  re-opens the exact plan (the plan is encoded in the URL).
- **Hindi**: full UI translation, including service names and descriptions that
  come from the config (`label.en` / `label.hi`), and Devanagari font.

## Assumptions

- Rates are realistic sample numbers for illustration, not TheCarePal's prices.
- GST at 18% is applied to everything for simplicity. In reality some
  nurse-led services may be exempt; the rate is one value in the config.
- Long-stay discounts apply to care charges only, not to add-ons.
- The onboarding fee is waived for plans of 30 days or more.
- "Duration" offers 1 week to 6 months presets plus a custom 1–365 days.
- The estimate is indicative; the final quote comes after a home assessment,
  and the UI says so.
- SQLite was chosen to keep the demo zero-setup. The repository layer is small
  and would map directly to Firestore collections.

# Invoice App — Project Context

## What This Is
A custom invoice generator + dashboard for a solo freelancer (Shravan Kumar), replacing Wave (waveapps.com). Wave no longer supports auto-sending for users outside US/Canada. This tool handles the new financial year (April 2026 onwards).

## Stack
- **Framework**: Next.js 14 (App Router)
- **UI**: Tailwind CSS + shadcn/ui
- **Database**: SQLite via Prisma ORM
- **PDF Generation**: HTML-based templates (server-side rendering via `src/lib/invoice-templates.ts`), with puppeteer for PDF download
- **Single user, local SQLite, runs on-machine**

## Current State (as of 2026-04-03)

### What's Built & Working
- Full CRUD for clients (list, add, edit)
- Invoice creation as **drafts** (no number assigned yet)
- **Draft editing** — all fields editable while in draft status
- **Multi-line items** — description, optional rich-text scope details, qty, rate
- **3 PDF templates** — minimal, classic, artistic (switchable via `.env` `INVOICE_TEMPLATE` or `?template=` query param)
- **Live split-pane editor** — form on left, live HTML preview on right (debounced 400ms)
- **Signature embedding** — PNG/JPG loaded as base64, shown in both preview and PDF download
- **Finalize flow**: Draft -> Sent assigns the next invoice number (FY-prefixed, e.g. FY27-001)
- **PDF download** — puppeteer renders HTML template to real PDF (via `?download=1` on the PDF route)
- **TDS tracking**: when marking Sent -> Paid, user enters TDS section (194J, 194C, etc.), TDS amount, net received, payment date
- **Dashboard** with FY-aware totals: Total Invoiced, Net Received, TDS Deducted, Outstanding
- Monthly revenue bar chart, client breakdown pie chart
- FY and client filters on dashboard and invoice list
- Deck Rooster seeded as default client (mohit@deckrooster.com, Chandigarh address)
- **N-part invoice sequences** — "Next Invoice" button creates linked parts (1 of N, 2 of N, etc.) for multi-part project billing (e.g. advance + final)
- **Duplicate invoice** — clone sent/paid invoices as new drafts
- Invoice counter starts fresh at FY27-001

### Key Design Decisions
- **Invoice numbers are only assigned on finalize** (Draft -> Sent), not on creation. This prevents wasted numbers if a draft has mistakes.
- **Drafts have `number: null`** in the database (nullable unique constraint).
- **TDS is tracked per invoice** with `tdsSection`, `tdsRate`, `tdsAmount` and `netReceived` fields, filled when marking as Paid.
- **FY date ranges use UTC** to avoid timezone issues with IST (important: `Date.UTC()` not `new Date(year, month, day)`).
- **N-part sequences**: Invoices in a sequence share a `sequenceId`. N is not pre-defined — it grows as parts are added. Each part gets its own independent invoice number from the FY counter. The "X of N" label is computed from the count of invoices sharing the same sequenceId.
- **PDF templates are HTML-based** — server-side rendered, puppeteer converts to PDF for download. No @react-pdf/renderer (legacy dependency, unused).

### Database Schema
- `Invoice.number` is `String? @unique` (nullable for drafts, FY-prefixed e.g. "FY27-001")
- `Invoice.tdsSection`, `tdsRate`, `tdsAmount`, `netReceived` are nullable (filled on payment)
- `Invoice.invoicePart` is `Int?` (position in sequence: 1, 2, 3...)
- `Invoice.sequenceId` is `String?` (shared ID linking all invoices in the same sequence)
- `LineItem` has `description`, `details` (optional rich text), `qty`, `rate`, `amount`, `sortOrder`
- `InvoiceCounter` singleton per FY prefix (e.g. id="FY27", current=0)

## Business Rules

### Invoicing
- Invoice numbering: FY-prefixed, e.g. FY27-001, FY27-002 (counter starts fresh each FY)
- Primary client: **Deck Rooster** (98% of invoices). 1-2 other freelance clients per year.
- Invoices support **multiple line items** (description + optional scope details + qty + rate)
- Amount is **gross only** — no TDS breakdown on the invoice PDF (TDS is handled on Razorpay's side)
- Status flow: **Draft -> Sent -> Paid**
  - Draft: freely editable, no invoice number
  - Sent: invoice number assigned, no longer editable
  - Paid: payment details recorded (net received, TDS deducted, date)
- Currency: **INR** only

### N-Part Invoice Sequences
- Used for multi-part project billing (e.g. advance payment + final payment)
- "Next Invoice" button on invoices page shows eligible sent/paid invoices to chain from
- First time: creates a sequence — source becomes part 1, new draft becomes part 2
- Subsequent: appends to existing sequence (part 3, 4, etc.)
- Each part gets its own independent invoice number
- "X of N" badge shown in invoice list; N updates dynamically

### TDS Tracking
- When marking an invoice as Paid, user enters: date received, TDS section, TDS rate, TDS amount, net received
- Dashboard shows FY-wise TDS totals for Form 26AS reconciliation
- Supported sections: 194J (10%), 194C (1-2%), 194I (10%), etc.

### Financial Year
- Indian financial year: **April to March**
- Dashboard and all date filtering should be FY-aware
- FY display format: "FY 2026-27" for April 2026 - March 2027
- Invoice number prefix: "FY27" for FY 2026-27

### PDF Template — Pre-filled Business Details
- **Name**: Shravan Kumar
- **Address**: 34/46, Shri Vishnu Nivas, Annal Gandhi St, MGR Nagar, Chennai, Tamil Nadu 600078, India
- **Phone**: +91 8287038890
- **Bank**: Federal Bank
- **IFSC**: FDRL0007777
- **A/C No**: 77770133003869
- **PAN**: DSRPS2830G
- 3 templates: minimal (typography-driven), classic (purple accent, formal), artistic (warm tones, serif headings)
- Signature image embedded as base64 from `./Signature_small.png`
- Amount in words (Indian English: CRORE, LAKH, THOUSAND format)

### Deck Rooster Client Details
- **Email**: mohit@deckrooster.com
- **Address**: #1063, Sector 15B, Chandigarh 160015

### Dashboard
- FY-aware totals: total invoiced, net received, TDS deducted, outstanding
- Charts: monthly revenue bar chart, client-wise breakdown pie chart
- Filters: by client, by financial year

## Planned Features (not yet built)

### High Priority
- Auto-email sending invoices (PDF attachment) — the exact thing Wave broke
- TDS section presets per invoice (194J at 10%, 194C at 1%/2%, etc.)
- TDS Receivables Summary report (per client, per FY, per TDS section)
- Form 26AS reconciliation view

### Medium Priority
- Automated payment reminders (email + WhatsApp)
- Client-wise outstanding ledger
- Partial payment recording

### V2 Features
- Razorpay payroll browser automation (uploading PDF, filling fields, submitting payment request)
- Razorpay login flow with OTP from Gmail
- Razorpay/Cashfree payment link embedded in invoice

## File Structure
```
invoice-app/
├── CLAUDE.md              # This file
├── package.json
├── next.config.js
├── tsconfig.json
├── tailwind.config.ts
├── Signature_small.png    # Signature image for PDF templates
├── .env                   # DATABASE_URL, business details, template choice, signature path
├── prisma/
│   ├── schema.prisma      # Client, Invoice, LineItem, InvoiceCounter
│   ├── seed.ts            # Seeds Deck Rooster client
│   └── dev.db             # SQLite database
├── src/
│   ├── lib/
│   │   ├── prisma.ts      # Prisma client singleton
│   │   ├── constants.ts   # Business details (name, address, phone, bank), FY helpers, TDS sections
│   │   ├── utils.ts       # formatCurrency, formatDate, toInputDate, cn
│   │   └── invoice-templates.ts # 3 HTML-based PDF templates (minimal, classic, artistic)
│   ├── components/
│   │   ├── nav.tsx         # Sidebar navigation (Dashboard, Invoices, Clients, TDS Report)
│   │   ├── invoice-editor.tsx # Split-pane editor with live preview, payment form, duplicate
│   │   ├── rich-textarea.tsx  # Rich text editor (bold, italic, bullets) for scope details
│   │   ├── dashboard-charts.tsx # TotalsCards, MonthlyRevenueChart, ClientBreakdownChart
│   │   ├── date-picker.tsx
│   │   ├── select.tsx
│   │   └── combobox.tsx
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx        # Dashboard (TDS totals, charts)
│   │   ├── globals.css
│   │   ├── clients/
│   │   │   ├── page.tsx    # Client list
│   │   │   ├── new/page.tsx # Add client
│   │   │   └── [id]/edit/page.tsx # Edit client
│   │   ├── invoices/
│   │   │   ├── page.tsx    # Invoice list with "Next Invoice" + "New Invoice" buttons, X of N labels
│   │   │   ├── new/page.tsx # Create draft invoice
│   │   │   └── [id]/page.tsx # Invoice detail (edit draft, preview PDF, finalize, payment form)
│   │   ├── reports/
│   │   │   └── tds/page.tsx # TDS report (stub)
│   │   └── api/
│   │       ├── clients/
│   │       │   ├── route.ts        # GET (list), POST (create)
│   │       │   └── [id]/route.ts   # GET (single), PUT (update)
│   │       ├── invoices/
│   │       │   ├── route.ts        # GET (list, FY-filtered), POST (create draft)
│   │       │   ├── [id]/route.ts   # GET, PATCH (edit draft / finalize / mark paid), DELETE
│   │       │   ├── [id]/duplicate/route.ts # POST (duplicate as new draft, supports asNextPart for sequences)
│   │       │   └── [id]/pdf/route.ts # GET (HTML preview or PDF download via ?download=1)
│   │       ├── preview/route.ts    # POST (preview for unsaved drafts, includes signature)
│   │       ├── settings/route.ts   # GET (business details from .env)
│   │       ├── dashboard/route.ts  # GET (totals with TDS, monthly, client breakdown)
│   │       └── reports/tds/route.ts # GET (stub)
```

## macOS App Shortcut
- Installed at `/Applications/Invoicely.app` — launchable via Spotlight/Raycast
- Bundle ID: `com.shravankumar.invoicely`
- Starts dev server on port 3077 if not running, then opens browser

## Commands
- `npm run dev` — start dev server (port 3000 or next available)
- `npx prisma db push` — sync schema to SQLite
- `npx prisma db seed` — seed Deck Rooster client
- `npx prisma generate` — regenerate Prisma client after schema changes
- `npx prisma studio` — visual DB browser
- `npx prisma db push --force-reset --accept-data-loss` — reset database (wipes all data)

## Known Issues / Gotchas
- After changing `prisma/schema.prisma`, must run `prisma db push` AND `prisma generate`, then restart dev server
- FY date filtering uses UTC dates (`Date.UTC()`) to avoid IST timezone boundary issues
- Dev server port may vary (3000 or 3077) — check terminal output. The macOS app shortcut uses port 3077.
- `@react-pdf/renderer` is still in package.json but unused — PDF generation is now HTML + puppeteer

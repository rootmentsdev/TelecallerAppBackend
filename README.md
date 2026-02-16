# Telecaller App Backend

> **Production-grade Express.js backend for lead management, telecalling workflows, and automated syncing.**

---

## 📖 Project Overview

This backend is the central hub for telecalling operations. It balances three sources of data:

1. **Automated API sync** — Return leads and Stores (from external ERP).
2. **Manual CSV import** — Walk-in and Loss of Sale leads.
3. **Direct telecaller input** — Call status, remarks, follow-ups, and manual add-lead.

---

## 🔧 Environment Variables

Create a `.env` file in the project root:

```env
# Server
PORT=8800
MONGO_URI=mongodb+srv://...
JWT_SECRET=your_jwt_secret

# External API sync (Return leads)
RETURN_API_BASE_URL=https://rentalapi.rootments.live
RETURN_API_ENDPOINT=/api/Reports/GetReturnReport
RETURN_API_KEY=your_api_token
SYNC_CONCURRENCY=5
API_SYNC_INCREMENTAL_DAYS=7

# Optional: Scheduler
API_SYNC_ENABLED=true
API_SYNC_TIME=*/20 * * * *
API_SYNC_TIMEZONE=Asia/Kolkata
```

---

## 📜 Scripts

| Script | Description |
|--------|-------------|
| `npm start` | Run server (production) |
| `npm run dev` | Run server with nodemon |
| `npm run sync:api` | Run API sync manually (Stores + Return leads) |
| `npm run sync:all` | Full sync (API + CSV flow) |
| `npm run verify:data` | Verify MongoDB data |
| `npm run verify:sync` | Verify sync system state |
| `npm run check:duplicates` | Dry-run duplicate check |
| `npm run cleanup:duplicates` | Dry-run duplicate cleanup |
| `npm run cleanup:duplicates:live` | Run duplicate cleanup |
| `npm run unlock:sync` | Clear global sync lock |
| `npm run backfill:report-telecaller` | Dry-run: backfill report telecaller mapping |
| `npm run backfill:report-telecaller:live` | Backfill report `createdByEmpId`/`createdByName` from `editedBy` |

CSV import scripts (manual): `import:walkin`, `import:lossofsale`, `import:all:walkin`, `import:all:lossofsale`.

---

## 🏷️ Lead Types

| Type | Source | Description |
|------|--------|-------------|
| **enquiry** | Manual / Walk-in | Default for general leads. |
| **return** | API sync | Synced from external ERP. |
| **lossOfSale** | CSV | Lost-sale leads. |
| **booked** | Manual | Booked leads (e.g. Add Lead). |

---

## ♻️ Lead Lifecycle

A lead exists in **exactly one** active collection at a time.

1. **Leads** — New leads (sync, CSV, or manual). Telecaller calls and then:
   - **Complaint** — `mark_as_complaint: true` → move to **Complaints** (lead deleted).
   - **Follow-up** — `follow_up_flag: true` + `follow_up_date` → move to **FollowUps** (lead deleted).
   - **Report** — Otherwise → move to **Reports** (lead deleted).

2. **FollowUps** — Call again; then:
   - Can move to **Complaint**, stay in **FollowUps** (new date), or move to **Report**.

3. **Complaints** — Re-calls do **not** move the record. Use **PATCH** or **POST** `/api/pages/complaints/:id/call` with `call_duration` and optional `complaint_remarks` (or `remarks`). The complaint’s `callDuration` is overwritten and `complaint_remarks` is set. No history array or extra aggregate fields.

4. **Reports** — Final archive; no further moves.

---

## 🗄️ Collections

| Collection | Purpose |
|------------|---------|
| **Leads** | Active working pool. |
| **FollowUps** | Callback queue. |
| **Complaints** | Issues (re-call updates same document). |
| **Reports** | Processed interactions archive. |
| **SyncLock** | Sync locking. |
| **Users** | Telecallers, team leads, admins. |

---

## 📡 API Overview

**Base paths:**  
- Telecaller app: `/api` (auth, pages, reports, assign, import).  
- Admin dashboard: `/admin` (auth, reports, telecaller-summary, etc.).

### Authentication

- **Telecaller app:** `POST /api/auth/login` (employeeId + password; external API then local DB). `POST /api/auth/register` (create telecaller). `GET /api/auth/profile` (protected).
- **Admin dashboard:** `POST /admin/auth/login` (separate admin auth).

### Leads (`/api/pages`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/leads` | List leads (filters: leadType, store, dates, etc.) |
| GET | `/leads/:id` | Get lead by id |
| PATCH / POST | `/leads/:id` | Update lead and move (complaint / follow-up / report) |
| GET | `/return/:id` | Get return lead |
| POST | `/return/:id` | Update return lead and move |
| GET | `/loss-of-sale/:id` | Get loss-of-sale lead |
| POST | `/loss-of-sale/:id` | Update loss-of-sale lead and move |
| POST | `/add-lead` | Create lead (admin, teamLead, telecaller) |

### Follow-ups (`/api/pages`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/follow-ups` | List follow-ups |
| GET | `/follow-ups/:id` | Get follow-up by id |
| POST | `/follow-ups/:id` | Update follow-up and move (complaint / follow-up / report) |

### Complaints (`/api/pages`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/complaints` | List complaints |
| GET | `/complaints/:id` | Get complaint by id |
| PATCH / POST | `/complaints/:id/call` | Re-call: set `call_duration` (required) and `complaint_remarks` or `remarks`; optionally update name, phone, store, etc. |

### Reports

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/reports` | List reports (filters) |
| GET | `/api/reports/call-summary` | Call summary for current user |
| GET | `/api/reports/:id` | Get report by id |

### Assignment (`/api/assign`)

- `POST /single` — Assign one lead (admin, teamLead).
- `POST /bulk` — Assign many leads (admin, teamLead).

### Import

- `POST /api/import/leads` — CSV import (admin, teamLead); field `csvFile`.
- `POST /api/import/csv` — CSV/Excel upload (admin, super_admin); field `file`.

### Admin (`/admin`)

- `GET /health` — Admin API health.
- `GET /telecaller-summary` — Aggregated telecaller performance (dateFrom, dateTo).
- `GET /complaints/pivot` — Complaints pivot (groupBy, filters).
- `GET /reports` — Admin reports list (filters, pagination, filtersOnly for dropdowns).
- `GET /users` — List users (optional role filter).

### Health

- `GET /api/health` — Public health check.

---

## 🔄 Sync & CSV

### API sync (Return + Stores)

- **Schedule:** Every 20 minutes (node-cron; configurable via `API_SYNC_TIME`).
- **Scope:** Stores list and Return leads (rolling window, e.g. `API_SYNC_INCREMENTAL_DAYS`).
- **Lock:** Global sync lock to avoid overlapping runs; auto-cleared if expired (~15 min).
- **Concurrency:** Configurable (`SYNC_CONCURRENCY`).

### CSV

- **Walk-in / Loss of Sale:** Manual upload via `/api/import/leads` or `/api/import/csv` (see Import above). Deduplication by phone (and other keys as per implementation).

---

## 📘 Swagger

Interactive API docs: **GET /api-docs**

---

## 🆔 Identity & attribution

- **createdByEmpId / createdByName** — Set when a lead is created (e.g. Add Lead) or, for **return** leads (no creator from sync), backfilled when a telecaller first processes the lead and it is moved to Report/Complaint.
- **editedBy / editedByEmpId / editedByName** — Last user who updated the record. Used for reports and admin telecaller performance.

---

## Refund Status Field (Return Leads Only)

- **Applicable only to** `lead_type: return`.
- Passed from frontend in **snake_case** (`refund_status`).
- **Optional**; default is `null`.
- **Preserved across workflow:** Lead → Report, Lead → Complaint, Lead → FollowUp, and when FollowUp/Complaint moves to Report.
- **Visible** in Admin Dashboard under **Calls Report** for return-type rows (column "Refund Status"); non-return rows show "-".
- **Filtering:** Admin report filter includes an optional **Refund Status** dropdown when Lead Type is "Return".
- If `lead_type` is not `"return"`, `refund_status` is forced to `null` to avoid data pollution.

---

## 🔎 Filtering (summary)

- **Leads:** Return leads use `returnDate` for date filters; others use `createdAt`. Store format: `"Brand - Location"`; use centralized store logic (e.g. Edappal vs Edappally).
- **Reports:** `dateFrom`/`dateTo` apply to `editedAt` by default; optional `createdAt` filters for lead creation date.
- **Admin telecaller summary:** Work date = `editedAt` (reports), `complaintMarkedAt` (complaints).

---

## ⚠️ Notes

1. **Optional fields** — `subCategory`, `closingAction`, `remarks`, etc. can be omitted; stored as null or unchanged.
2. **Flat responses** — No nested snapshots; responses are flat for clients.
3. **Single copy** — On move (e.g. Lead → Complaint), the lead is **deleted** from the source after the destination document is created.
4. **Snake_case** — API accepts snake_case (e.g. `closing_action`); stored as camelCase.
5. **Store filtering** — Use the shared store-filter utility; avoid ad-hoc regex (e.g. Edappal vs Edappally).

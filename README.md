# Telecaller App Backend

> **Production-grade Express.js backend for lead management, telecalling workflows, and automated syncing.**

---

## 📖 Project Overview

This backend is the central hub for telecalling operations. It balances three sources of data:

1. **Automated API sync** — Return leads and Stores (from external ERP).
2. **Manual CSV import** — Walk-in and Loss of Sale leads.
3. **Direct telecaller input** — Direct additions, Call status updates, remarks, follow-ups, and manual add-leads.

---

## 🔧 Environment Variables

Create a `.env` file in the project root:

```env
# Server
PORT=8800
NODE_ENV=development

# MongoDB Access
MONGO_URI=mongodb+srv://...

# JWT Token Secret
JWT_SECRET=your_jwt_secret
JWT_EXPIRE=7d

# External API Sync
BOOKING_API_BASE_URL=https://rentalapi.rootments.live/api
BOOKING_CONFIRMATION_ENDPOINT=/Reports/GetBookingReport
RETURN_API_KEY=your_api_token
API_TOKEN=your_api_token

# Sync Preferences
SYNC_BATCH_SIZE=500
SYNC_DELAY_MS=2000
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

---

## 🏷️ Lead Types

| Type | Source | Description |
|------|--------|-------------|
| **enquiry** | Manual / Walk-in | Default for general leads. |
| **return** | API sync | Synced from external ERP. Features `refund_status`. |
| **lossOfSale** | CSV | Lost-sale leads. |
| **booked** | Manual | Booked leads (e.g. Add Lead). |

---

## ♻️ Lead Lifecycle

A lead exists in **exactly one** active collection at a time. The system prevents duplicates across these pipelines.

1. **Leads** — New leads (sync, CSV, or manual). The Telecaller initiates a call and makes an update:
   - **Complaint** — If `mark_as_complaint: true`, the lead is moved to the **Complaints** collection.
   - **Follow-up** — If `follow_up_flag: true` with a `follow_up_date`, the lead is moved to the **FollowUps** collection.
   - **Report** — Otherwise, it is moved to the **Reports** collection (representing a completed workflow).
   *The original Lead document is deleted after the move.*

2. **FollowUps** — Telecaller calls again:
   - Can move to **Complaint** 
   - Can stay in **FollowUps** (re-scheduled with a new date) 
   - Can move to **Report** (completed)

3. **Complaints** — Highest priority workflow.
   - Re-calls do **not** move the record. Calling `/api/pages/complaints/:id/call` updates the `callDuration` and `complaint_remarks` or `remarks`. The document remains in the Complaints collection to ensure trackability.

4. **Reports** — Final archive; completed workflow. Reports cannot be moved back into active pools.

---

## 🗄️ Database Collections

| Collection | Purpose |
|------------|---------|
| **Leads** | Active working pool of new leads mapped to telecallers |
| **FollowUps** | Call-back queue with scheduled dates |
| **Complaints** | Escalated issues needing multiple updates |
| **Reports** | Processed interactions archive (Read-only context) |
| **SyncLock** | Mutex mechanism for batch deduplication |
| **Users** | Role-based system users (`telecaller`, `teamLead`, `admin`) |

---

## 📡 API Overview & Workflows

**Base paths:**  
- Telecaller app: `/api` (auth, pages, reports, assign, import).  
- Admin dashboard: `/api/admin` (auth, reports, telecaller-summary, etc.).

### 1. Authentication (`/api/auth` & `/admin/auth`)
- **Telecaller / Team Lead:** `POST /api/auth/login` (employeeId + password). Supports external API checks and fallback local DB validation.
- **Admin:** `POST /admin/auth/login` (admin username + password). Uses separate credentials defined as env constraints for added security.

### 2. Dashboard Actions (`/api/pages`)
The primary endpoints for accessing and manipulating leads in the telecaller UI.
- **`GET /leads`, `/follow-ups`, `/complaints`**: Lists documents. Robust centralized filtering by Date Range, Store Location, Statuses, and Editor Identities.
- **Update Mutations** limit modifications based on lead type (`/return/:id`, `/loss-of-sale/:id`, `/leads/:id`, `/follow-ups/:id`). Submitting changes automatically triggers the lifecycle migrations (to Report/Complaint/FollowUp) discussed above.

### 3. Analytics & Reporting (`/api/reports` & `/api/admin`)
- **Reports Base:** `GET /api/reports` generates tabular datasets of effectively closed operations. 
- **Admin Stats:** 
   - `GET /api/admin/telecaller-summary`: Highly granular breakdown of total calls, complaints, and durations grouped by Store and Date ranges (work dates based on `editedAt`).
   - `GET /api/admin/complaints/pivot`: Dynamic aggregation mapping to render visual charts based on configurable multi-field groupings (e.g. `store,subCategory,telecaller`).

### 4. Batch Operations & Admin Overrides (`/api/assign` & `/api/import`)
- Provides CSV Upload capabilities mapping spreadsheets directly to the local MongoDB model.
- Distribution endpoints (`POST /single`, `POST /bulk`) to evenly route leads across available Telecallers.

---

## 📘 Swagger API Documentation

Deeply integrated Swagger Interactive API docs:
Visit **`GET /api-docs`** in your browser to view schemas, interactive sandbox environments, and granular parameter descriptions for every endpoint. All route models are auto-documented using JS Docs across `routes/*.js` files.

---

## 🆔 Identity & Attribution Tracking

Data integrity relies heavily on attributing leads exactly to who operated them:

- **`createdByEmpId` / `createdByName`**: 
  Set during manual Lead Creation (UI Add Lead). If it's a synced lead (from ERP), there is no initial creator. When a telecaller first touches it and moves it to a Report/Complaint, these fields are correctly backfilled.
  
- **`editedBy` / `editedByEmpId` / `editedByName`**:
  Contains the ObjectId / strings representing the last user who updated the record. Driving factor for the Admin Dashboard performance tables.

- **Return Lead Workflows (`refund_status`)**: 
  Only applicable when `lead_type: "return"`. Stores the refund mechanism (snake_case from frontend) and strictly preserves this status as the lead transfers through the FollowUp/Complaint/Report lifecycle. It is cleared if forced onto a mismatching lead type to prevent data pollution.

---

## 🔎 Technical Nuances

1. **Date Filters**: 
  Various pipelines dictate specific queries. Telecaller interfaces largely use `createdAt` to fetch inbound lists, whereas Admin reporting filters primarily use `editedAt` (or `complaintMarkedAt`) to calculate work completed on any given day regardless of when the lead originated.
2. **Flattened Payloads**: 
  The frontend expects flattened `.telecaller` abstractions. The backend enforces populating User objects and spreading their configurations out flat to map precisely to Recharts/AgGrid rendering constraints.
3. **Data Immutability**:
  Moving a Lead performs a Mongo Driver deletion in the source collection AFTER successful creation in the destination collection inside an execution context. 

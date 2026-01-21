# Telecaller App Backend

A robust Node.js/Express backend for the Telecaller Application, designed to manage lead lifecycles, incremental external API syncs, CSV uploads, and comprehensive reporting.

## 🚀 Purpose

This backend serves as the central hub for telecallers, team leads, and admins to:
*   **Manage Leads**: Track leads from initial enquiry to conversion or closure.
*   **Automate Data Sync**: Incrementally sync leads from external APIs with protection against overlaps.
*   **Handle CSV Imports**: Bulk upload leads (Walk-in/Loss of Sale) with strict duplicate checks.
*   **Track Issues**: Escalate problematic calls directly to a specialized queue.

---

## ⚡ Key Features

*   **Lead Lifecycle Management**: Seamless movement between collections:
    *   `Leads` (Active) → `FollowUps` (Scheduled) → `Reports` (Closed/Logged).
*   **Issue Escalation**: 
    *   Leads marked as "Issue" are moved to the `StarredCalls` collection.
*   **Smart Duplicate Prevention**: 
    *   Database-level unique indexes ensure no duplicate leads based on phone, name, store, and lead type.
*   **Incremental Sync Engine**: 
    *   Background scheduler (cron) runs every 20 minutes (`sync/apiOnly.js`).
    *   Uses a `SyncLock` mechanism (MongoDB) to prevent race conditions or overlapping sync jobs.
*   **CSV Upload Web UI**: 
    *   Built-in static frontend for Admins to upload bulk leads effectively.

---

## 🛠️ Tech Stack

*   **Runtime**: Node.js
*   **Framework**: Express.js (v5)
*   **Database**: MongoDB / Mongoose (v9)
*   **Documentation**: Swagger (OpenAPI 3.0)
*   **Scheduling**: node-cron with custom locking logic
*   **Authentication**: JWT (JSON Web Tokens)
*   **Deployment**: Optimized for Render.com

---

## 📂 Repository Structure

| Folder | Description |
| :--- | :--- |
| `controllers/` | Logic for lead movement (`handleLeadMovement`), reports, and CSV processing. |
| `models/` | Mongoose schemas (`Lead`, `FollowUp`, `Report`, `StarredCall`, `SyncLock`). |
| `routes/` | API endpoints definitions (`pageRoutes`, `csvUploadRoutes`, `reportRoutes`). |
| `sync/` | Core sync engine. `apiOnly.js` (orchestrator) and `api/` (specific sync logic). |
| `upload-ui/` | Static HTML/JS files for the CSV Upload Web Interface. |
| `scheduler/` | Cron job setup that triggers the sync engine. |
| `scripts/` | Maintenance scripts for cleanup, index creation, and verification. |
| `validators/` | Input validation logic for APIs. |

---

## 🚀 Quick Start

### Prerequisites
*   Node.js (v18+ recommended)
*   MongoDB (URI string)

### Setup

1.  **Clone the repository**
    ```bash
    git clone <repo-url>
    cd telecaller-backend
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Environment Configuration**
    Create a `.env` file in the root directory:
    ```env
    PORT=8800
    MONGO_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/telecaller
    JWT_SECRET=your_super_secret_key
    
    # External API Config
    API_BASE_URL=https://rentalapi.rootments.live
    API_TOKEN=your_external_api_token
    STORE_USE_POST=false
    ```

4.  **Run Locally**
    ```bash
    # Development mode (restarts on changes)
    npm run dev
    
    # Production start
    npm start
    ```

5.  **Access API & Docs**
    *   Server: `http://localhost:8800`
    *   Swagger Docs: `http://localhost:8800/api-docs`
    *   Upload UI: `http://localhost:8800/upload`

---

## 🐳 Environment Variables

| Variable | Description | Example |
| :--- | :--- | :--- |
| `PORT` | API Port | `8800` |
| `MONGO_URI` | MongoDB Connection String | `mongodb+srv://...` |
| `JWT_SECRET` | Secret for signing auth tokens | `mysecret123` |
| `API_BASE_URL` | Base URL for external Rental API | `https://api.example.com` |
| `API_TOKEN` | Auth token for external API | `abc-123-xyz` |
| `SYNC_TRIGGER` | (Optional) Label for sync logs | `auto` / `manual` |

---

## 🔄 Core Flows

### A) Lead Lifecycle
Determined by `handleLeadMovement` in `pageController.js`:
1.  **Lead Update**: User updates a lead status/remarks via `PUT /api/pages/:type/:id`.
2.  **Move to FollowUp**: If `follow_up_flag: true` AND `follow_up_date` is present:
    *   Created in `FollowUps`.
    *   Removed from `Leads`.
3.  **Move to Reports**: Default action (if closed/updated without follow-up):
    *   Created in `Reports`.
    *   Removed from `Leads`.

### B) Issue Flow (Starring)
1.  **Trigger**: User checks "Mark as Issue" in UI (`mark_as_issue: true`).
2.  **Priority**: Highest priority. Overrides follow-up flag.
3.  **Action**: 
    *   Created in `StarredCalls`.
    *   Removed from source collection.

### C) External API Sync
1.  **Trigger**: `scheduler/apiSyncScheduler.js` (Every 20 mins) calls `sync/apiOnly.js`.
2.  **Locking**: Acquires `SyncLock` (ID: `GLOBAL_API_SYNC`). Auto-expires after 15 mins if stuck.
3.  **Process**:
    *   Sync Stores (`sync/api/sync_storelist.js`)
    *   Sync Returns (`sync/api/sync_return.js`)
    *   *Note: Booking sync is currently disabled/removed.*
4.  **Completion**: Releases lock and saves `SyncLog` entry.

---

## 🛡️ Duplicate Prevention & Validation

The system enforces strict uniqueness to prevent double-calling.

### 1. Mongoose Indexes
Defined in `models/Lead.js`:

*   **General/Walk-in/LossOfSale**:
    *   Unique Index: `{ name: 1, phone: 1, leadType: 1, store: 1 }`
    *   *Effect*: Prevents re-creating the same customer for the same store & type.

### 1. Creation
*   **Returns:** Created automatically every 20 mins via Sync.
*   **Walk-ins/Loss-of-sale:** Created via CSV Uploads (Stored in `Leads`).
*   **Manual:** Created via `POST /api/pages/add-lead`. 
    *   **DEFAULT BEHAVIOR**: Manual leads are effectively "Calls that just happened". They are saved directly to **Reports** (Archive). They are **NOT** created in the `Leads` collection unless specified otherwise (legacy/exception).
    *   **Follow-Up**: If flagged, saves to `FollowUps`.
    *   **Complaint**: If flagged, saves to `Complaints`.

### 2. Processing (The Priority Chain)
When a Telecaller submits an update for a Lead (or FollowUp):
1.  **Priority 1 (Complaint):** If `mark_as_complaint` is true → **Move to Complaints**. (Logic stops).
2.  **Priority 2 (Follow-Up):** If `follow_up_flag` is true → **Move to FollowUps**.
3.  **Priority 3 (Report):** If neither above → **Move to Reports**.

> **Crucial Rule:** A lead cannot exist in two places. It is **Deleted** from the Source (Leads/FollowUps) immediately after being created in the Destination.

### 3. Date Filtering Rules
*   **Standard Leads:** Filter by `createdAt` (Database creation time).
*   **Return Leads:** Filter by `returnDate` (The actual event date), **ignoring** `createdAt`.

---

## 🔄 Incremental Sync System
*   **Scheduler:** Runs every **20 minutes**.
*   **Scope:** Syncs **Stores** and **Return Leads** ONLY.
*   **Locking:** Uses a global MongoDB lock (`SyncLock`) to prevent overlapping syncs.
*   **Expiry:** Locks auto-expire after 15 minutes to prevent deadlocks.

> **Note:** Loss of Sale and Walk-ins are **NOT** synced automatically. They require manual CSV uploads.

---

## 📂 CSV Upload System
*   **Endpoint:** `/api/upload/csv`
*   **Supported Types:** `walkin`, `lossofsale`
*   **Destination:** Always created in `Leads` collection.
*   **Deduplication:**
    *   **LossOfSale:** Updates existing record if `name` + `phone` matches.
    *   **Walk-in:** Updates existing record if `phone` matches.

---

## 📤 Telecaller CSV Upload Web UI

A built-in utility for admins to upload leads without Postman.

*   **URL**: `https://<your-domain>/upload` (or `/login`)
*   **Tech**: Vanilla HTML/JS (located in `upload-ui/`).
*   **API Used**: `POST /api/import/csv`
*   **Features**:
    *   Drag-and-drop CSV/Excel.
    *   Select Lead Type (Walk-in / Loss of Sale).
    *   Real-time progress and summary (Inserted/Updated/Skipped).

---

## 📚 API Documentation

Swagger is available at `/api-docs`.

### Key Endpoints
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/pages/leads` | List leads with filters (store, date, type). |
| `POST` | `/api/pages/add-lead` | Create a new lead manually. |
| `PUT` | `/api/pages/:type/:id` | Update lead & move to Report/FollowUp. |
| `POST` | `/api/upload/csv` | Admin endpoint for bulk CSV import. |
| `GET` | `/api/reports` | Fetch generated reports. |
| `GET` | `/api/health` | Service health check. |

---

## 🛠️ Scripts & Maintenance

Defined in `package.json`. Use `npm run <script>`:

*   **Sync**:
    *   `sync:api`: Run external API sync manually.
    *   `sync:stores`: Sync only stores.
*   **Maintenance**:
    *   `check:duplicates`: Scan DB for potential validation violations.
    *   `cleanup:duplicates`: Remove duplicates based on strict rules.
    *   `unlock:sync`: Force release the global sync lock (if stuck).
    *   `verify:data`: comprehensive integrity check.

---

## 🚢 Deployment (Render)

This repo is optimized for Render web services.

*   **Build Command**: `npm install`
*   **Start Command**: `npm start`
*   **Static Assets**: The `upload-ui` folder is served statically by Express, so no separate static site is needed.
*   **Health Check Path**: `/api/health`

**Troubleshooting Render Deploys:**
1.  **Swagger Errors**: If you see "YAML Semantic Error", ensure no inline YAML in JSDoc uses unescaped format characters.
2.  **Mongoose Warnings**: "Duplicate index" warnings are benign if the index definition hasn't changed.

---

## 🤝 Contributing

1.  **Branching**: Use `feature/xyz` or `fix/issue-name`.
2.  **Testing**:
    *   Run `npm run verify:data` before submitting PRs to ensure no data integrity issues.
    *   Do not modify business logic (lead movement) without verifying `controller` behavior.
3.  **Linting**: Ensure code follows the existing ESM import style.

---

## 📄 License

**ISC License**
Property of Rootments. Internal use only recommended.

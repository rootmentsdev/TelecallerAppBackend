# Telecaller App Backend

> **Production-grade Express.js backend for lead management, telecalling workflows, and automated syncing.**

---

## 📖 What This Backend Does
This backend acts as the central hub for the Telecalling operations. It balances three critical sources of data:
1.  **Automated API Syncs** (for Return leads & Store lists).
2.  **Manual CSV Imports** (for Walk-in & Loss of Sale leads).
3.  **Direct Telecaller Input** (Call status, remarks, follow-ups).

It enforces a strict **lifecycle** to ensure leads move from "New" to "Processed" without data loss or duplication.

---

## 🧠 Core Concepts

| Concept | Description |
| :--- | :--- |
| **Leads** | The active working pool. All new data (Synced Returns, CSV Imports) starts here. |
| **FollowUps** | A separate holding area for leads that need a callback (`followUpFlag: true`). |
| **Complaints** | High-priority bucket for issues (`mark_as_complaint: true`). These exit the normal flow immediately. |
| **Reports** | The **Final Archive**. When a lead is edited/processed (and not moved to FollowUp/Complaint), it moves here. |

---

## 🏷️ Supported Lead Types
The system strictly supports the following `leadType` enum values:
*   `return` (Synced automatically)
*   `lossOfSale` (Imported via CSV)
*   `enquiry` (Default / Walk-ins)
*   `booked`

> **Note:** "General" leads are treated as `enquiry` or `lossOfSale` depending on input source.

---

## 🔄 High-Level Workflow
```text
[ SOURCE ]                  [ ACTIVE POOL ]             [ OUTCOME ]

External API  --Sync-->     LEADS COLLECTION
(Returns)                       │
                                │ (Telecaller calls lead)
CSV Upload    --Import-->       │ ──> [ Mark as Complaint ] ──> COMPLAINTS
(Loss/Walkin)                   │
                                │ ──> [ Flag Follow-Up ] ─────> FOLLOW-UPS
Manual Entry  --Post-->         │                                 │
                                │                                 │ (Follow-up Again)
                                │ ──> [ Edit/Success/Fail ] ──> REPORTS
```

---

## 🛠️ Tech Stack
*   **Runtime:** Node.js
*   **Framework:** Express.js
*   **Database:** MongoDB (Mongoose)
*   **Authentication:** JWT + External API Verification
*   **Scheduling:** `node-cron`
*   **Documentation:** Swagger UI (`/api-docs`)

---

## 🔐 Authentication Flow
Authentication is **Hybrid**:
1.  **Login Request:** Frontend sends `employeeId` + `password`.
2.  **External Verification:** Backend bypasses local password check and verifies credentials against `rootments.in/api/verify_employee`.
3.  **Local Sync:** If valid, the user is created/updated in local MongoDB (for role/store mapping).
4.  **Session:** A JWT token is issued for API access.

> **Roles:** `admin`, `teamLead`, `telecaller`

---

## 📡 API Overview
Detailed contract available at `/api-docs` (Swagger).

### Leads & Processing
*   `GET /api/pages/leads` - List active leads (filtering by type, date, store).
*   `GET /api/pages/follow-ups` - List pending follow-ups.
*   `POST /api/pages/leads/:id` - Process a lead (Move to Report/Complaint/FollowUp).
*   `POST /api/pages/follow-ups/:id` - Process a follow-up.

### Special Flows
*   `GET /api/pages/return/:id` - Specialized view for Return leads (includes Booking No).
*   `GET /api/pages/loss-of-sale/:id` - Specialized view for Loss of Sale.

### Reports
*   `GET /api/reports` - View processed history (Final destination).

---

## ♻️ Lead Lifecycle Explained

### 1. Creation
*   **Returns:** Created automatically every 20 mins via Sync.
*   **Walk-ins/Loss-of-sale:** Created via CSV Uploads.
*   **Manual:** Created via `POST /api/pages/add-lead`.

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
*   **Deduplication:**
    *   **LossOfSale:** Updates existing record if `name` + `phone` matches.
    *   **Walk-in:** Updates existing record if `phone` matches.

---

## ⚙️ Local Setup

1.  **Clone & Install**
    ```bash
    git clone <repo>
    npm install
    ```

2.  **Environment Variables (`.env`)**
    ```env
    PORT=8800
    MONGO_URI=mongodb+srv://...
    JWT_SECRET=your_secret_key
    
    # External Auth
    VERIFY_EMPLOYEE_API_URL=https://rootments.in/api/verify_employee
    
    # Automatic Sync
    API_SYNC_ENABLED=true
    API_SYNC_TIME="*/20 * * * *"
    ```

3.  **Run**
    ```bash
    npm start         # Production
    npm run dev       # Development (Nodemon)
    ```

---

## 🧹 Maintenance Scripts
Located in `scripts/`:
*   `verify-sync-system.js`: Checks lock status and next scheduled run.
*   `unlock-sync.js`: Force-removes a stuck sync lock.
*   `check-duplicates.js`: Scans DB for duplicate phone numbers.

---

## ❌ What This Backend Does NOT Do
*   It does **NOT** sync "Booking" leads automatically (Legacy feature removed).
*   It does **NOT** allow editing a lead while keeping it in the `Leads` collection (Must move to FollowUp/Report).
*   It does **NOT** store passwords exclusively in MongoDB; it relies on external validation.

---

## 📄 License
Private Property of Rootments.

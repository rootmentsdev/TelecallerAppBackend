# Telecaller App Backend

> **Production-grade Express.js backend for lead management, telecalling workflows, and automated syncing.**

---

## 📖 Project Overview
This backend acts as the central hub for Telecalling operations. It balances three critical sources of data:
1.  **Automated API Syncs** (for Return leads & Stores).
2.  **Manual CSV Imports** (for Walk-in & Loss of Sale leads).
3.  **Direct Telecaller Input** (Call status, remarks, follow-ups).

---

## 🏷️ Core Lead Types
The system strictly supports the following `leadType` enum values:

| Type | Source | Description |
| :--- | :--- | :--- |
| **`enquiry`** | Manual / Walk-in | Default type for general leads. |
| **`return`** | API Sync | Automatically synced from external ERP. |
| **`lossOfSale`** | CSV Import | Leads marked as lost sales. |
| **`booked`** | Manual | Leads marked as booked (Manual entry). |

---

## ♻️ Lead Lifecycle
The system enforces a strict lifecycle to ensure data integrity. A lead exists in **exactly one** active collection at a time.

1.  **New Leads** (In `Leads` Collection)
    *   Sourced from Sync, CSV, or Manual Entry.
    *   Telecaller calls the lead.

2.  **Processing / Outcome**
    *   **Complaint:** If `mark_as_complaint: true` → Moves to **Complaints**.
    *   **Follow-Up:** If `follow_up_flag: true` → Moves to **FollowUps**.
    *   **Report:** If neither above → Moves to **Reports** (Archive).

3.  **Follow-Ups** (In `FollowUps` Collection)
    *   Telecaller eventually calls the follow-up.
    *   Can move to **Complaint** (Priority 1).
    *   Can remain in **FollowUps** (Priority 2, new date set).
    *   Can move to **Report** (Priority 3, completed).

---

## 🗄️ Collections Used
*   **`Leads`**: The active working pool.
*   **`FollowUps`**: Leads awaiting a callback.
*   **`Complaints`**: High-priority issues requiring admin attention.
*   **`Reports`**: The final archive of all processed interactions.
*   **`SyncLock`**: Audit log and locking mechanism for the sync engine.

---

## 📡 API Overview

### Authentication
*   **Login**: Validates against external API first, then local DB (`employeeId` + `password`).

### Leads
*   `POST /api/pages/add-lead` - Manually create a lead (Any type).
*   `GET /api/pages/leads` - List active leads with filtering.
*   `POST /api/pages/leads/:id` - Process a lead (Move to next stage).
*   `GET /api/pages/return/:id` - View Return lead details.
*   `GET /api/pages/loss-of-sale/:id` - View Loss of Sale lead details.

### Follow-Ups
*   `GET /api/pages/follow-ups` - List pending follow-ups.
*   `POST /api/pages/follow-ups/:id` - Process a follow-up.

### Reports
*   `GET /api/reports` - View processed history.

---

## 🔄 Sync & CSV

### Incremental Sync
*   **Frequency**: Every 20 minutes (`node-cron`).
*   **Targets**: `Return` leads and `Stores`.
*   **Logic**: Updates existing records or creates new ones. Locked to prevent overlaps.

### CSV Upload
*   **Target**: `LossOfSale` and `Enquiry` (Walk-ins).
*   **Logic**: Manual upload via `/api/upload/csv`. Deduplicates based on phone number.

---

## 📘 Swagger Documentation
Interactive API validation and documentation is available at:
`GET /api-docs`

---

## ⚠️ Strict Notes
1.  **Optional Fields**: Fields like `subCategory`, `closingAction`, `remarks` are optional. If not provided, they remain null/unchanged.
2.  **No Nested Snapshots**: Responses are flattened for easier mobile consumption.
3.  **Single Source of Truth**: A lead is **deleted** from its source collection immediately upon successful movement to a destination collection.
4.  **Snake Case Support**: The API accepts snake_case inputs (e.g., `closing_action`) for compatibility but normalizes them to camelCase (`closingAction`) for storage.

---

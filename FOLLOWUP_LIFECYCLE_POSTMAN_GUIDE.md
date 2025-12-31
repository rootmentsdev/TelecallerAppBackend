# Follow-Up Lifecycle Testing Guide (Postman)

This guide shows how to test the complete Follow-Up lifecycle flow: **Leads → FollowUps → Reports**

## Prerequisites

1. **Authentication Token**: Get your JWT token from login endpoint
2. **Base URL**: `http://localhost:8800` (or your server URL)
3. **Headers**: Add `Authorization: Bearer YOUR_TOKEN` to all requests

---

## Complete Lifecycle Flow

### **STEP 1: Get a Lead from Leads Collection**

**Purpose**: Find a lead to test the Follow-Up flow

**Request:**
```
GET /api/pages/leads?leadType=general&limit=10
```

**Headers:**
```
Authorization: Bearer YOUR_TOKEN
```

**Expected Response:**
```json
{
  "leads": [
    {
      "id": "6953703ba40f84cea542ccc4",
      "lead_name": "TEST CUSTOMER",
      "phone_number": "7025743212",
      "store": "Suitor Guy - Edappally",
      "lead_type": "general",
      ...
    }
  ],
  "pagination": { ... }
}
```

**Action**: Note the `id` of a lead (e.g., `6953703ba40f84cea542ccc4`)

---

### **STEP 2: Move Lead to FollowUps Collection**

**Purpose**: Set `follow_up_date` to automatically move lead from Leads → FollowUps

**Request:**
```
POST /api/pages/general/:id
```
(Replace `:id` with the lead ID from Step 1)

**Headers:**
```
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json
```

**Request Body:**
```json
{
  "call_status": "Not Called",
  "lead_status": "No Status",
  "follow_up_date": "2025-01-15T10:00:00.000Z",
  "remarks": "Need to follow up"
}
```

**Important**: 
- `follow_up_date` is **required** to trigger move to FollowUps
- When `follow_up_date` is provided, `followUpFlag` is automatically set to `true`
- Lead will be **removed from Leads** and **moved to FollowUps**
- **NO Report is created** at this stage

**Expected Response:**
```json
{
  "message": "General lead updated and moved to follow-ups",
  "followUp": {
    "_id": "6953703ba40f84cea542ccc4",
    "name": "TEST CUSTOMER",
    "phone": "7025743212",
    "leadType": "general",
    "followUpDate": "2025-01-15T10:00:00.000Z",
    "followUpFlag": true,
    "movedToFollowUpAt": "2025-12-30T...",
    ...
  }
}
```

**Verification Checklist:**
- ✅ Response shows `"moved to follow-ups"`
- ✅ `followUp` object is returned
- ✅ `followUpFlag: true` in response
- ✅ `followUpDate` matches your input

---

### **STEP 3: Verify Lead is in FollowUps Collection**

**Purpose**: Confirm the lead moved to FollowUps and is no longer in Leads

**Request 1: Get FollowUps List**
```
GET /api/pages/follow-ups?leadType=general
```

**Headers:**
```
Authorization: Bearer YOUR_TOKEN
```

**Expected Response:**
```json
{
  "leads": [
    {
      "id": "6953703ba40f84cea542ccc4",
      "lead_name": "TEST CUSTOMER",
      "phone_number": "7025743212",
      "lead_type": "general",
      "follow_up_date": "2025-01-15T10:00:00.000Z",
      ...
    }
  ],
  "pagination": { ... }
}
```

**Request 2: Verify Lead is NOT in Leads Collection**
```
GET /api/pages/leads?leadType=general
```

**Expected**: The lead should **NOT** appear in this list

**Request 3: Get Specific FollowUp by ID**
```
GET /api/pages/follow-ups/:id
```
(Use the same ID from Step 1)

**Expected Response:**
```json
{
  "id": "6953703ba40f84cea542ccc4",
  "lead_name": "TEST CUSTOMER",
  "phone_number": "7025743212",
  "lead_type": "general",
  "follow_up_date": "2025-01-15T10:00:00.000Z",
  "call_status": "Not Called",
  "lead_status": "No Status",
  ...
}
```

**Verification Checklist:**
- ✅ Lead appears in `/api/pages/follow-ups`
- ✅ Lead does NOT appear in `/api/pages/leads`
- ✅ Lead can be fetched by ID from FollowUps endpoint

---

### **STEP 4: Update FollowUp and Move to Reports**

**Purpose**: Complete the follow-up call and move to Reports (final state)

**Request:**
```
POST /api/pages/follow-ups/:id
```
(Use the same ID - it should still be in FollowUps)

**Headers:**
```
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json
```

**Request Body:**
```json
{
  "call_status": "Connected",
  "lead_status": "Interested",
  "remarks": "Customer confirmed interest, will call back",
  "call_duration": 300
}
```

**Important**:
- This endpoint **ONLY** works with FollowUps collection
- After this, lead is **removed from FollowUps** and **moved to Reports**
- Report is created with `category: "followup"`

**Expected Response:**
```json
{
  "message": "Follow-up lead updated and moved to reports",
  "report": {
    "_id": "6953703ba40f84cea542ccc5",
    "category": "followup",
    "lead_name": "TEST CUSTOMER",
    "phone_number": "7025743212",
    "lead_type": "general",
    "call_status": "Connected",
    "lead_status": "Interested",
    "call_duration": 300,
    "remarks": "Customer confirmed interest, will call back",
    "follow_up_date": "2025-01-15T10:00:00.000Z",
    "editedBy": "...",
    "editedAt": "2025-12-30T...",
    ...
  }
}
```

**Verification Checklist:**
- ✅ Response shows `"moved to reports"`
- ✅ `report` object is returned
- ✅ `category: "followup"` in report
- ✅ `lead_type: "general"` in report (should match original leadType)
- ✅ All updated fields are in report

---

### **STEP 5: Verify Lead is in Reports Collection**

**Purpose**: Confirm the lead moved to Reports and is no longer in FollowUps

**Request 1: Get Reports with leadType Filter**
```
GET /api/reports?leadType=general&page=1&limit=10
```

**Headers:**
```
Authorization: Bearer YOUR_TOKEN
```

**Expected Response:**
```json
{
  "reports": [
    {
      "report_id": "6953703ba40f84cea542ccc5",
      "category": "followup",
      "lead_name": "TEST CUSTOMER",
      "phone_number": "7025743212",
      "lead_type": "general",
      "call_status": "Connected",
      "lead_status": "Interested",
      "call_duration": 300,
      "follow_up_date": "2025-01-15T10:00:00.000Z",
      ...
    }
  ],
  "pagination": { ... }
}
```

**Request 2: Verify Lead is NOT in FollowUps**
```
GET /api/pages/follow-ups?leadType=general
```

**Expected**: The lead should **NOT** appear in this list

**Request 3: Get Specific Report by ID**
```
GET /api/reports/:report_id
```
(Use the `report_id` from Step 4 response)

**Expected Response:**
```json
{
  "report_id": "6953703ba40f84cea542ccc5",
  "category": "followup",
  "lead_name": "TEST CUSTOMER",
  "phone_number": "7025743212",
  "lead_type": "general",
  ...
}
```

**Verification Checklist:**
- ✅ Report appears in `/api/reports?leadType=general`
- ✅ Report has `category: "followup"`
- ✅ Report has `lead_type: "general"` (shows in general/new leads group)
- ✅ Lead does NOT appear in `/api/pages/follow-ups`
- ✅ Lead does NOT appear in `/api/pages/leads`

---

## Testing Edge Cases

### **Test 1: Try to Update FollowUp Twice**

**Scenario**: After Step 4, try to update the same FollowUp again

**Request:**
```
POST /api/pages/follow-ups/:id
```
(Same ID from Step 4)

**Expected Response:**
```json
{
  "message": "Follow-up lead not found. This endpoint only works with leads in the FollowUps collection.",
  "id": "6953703ba40f84cea542ccc4"
}
```

**Status Code**: `404`

**Reason**: Lead was already moved to Reports, so it no longer exists in FollowUps

---

### **Test 2: Update Lead Without follow_up_date**

**Scenario**: Update a lead from Leads without setting `follow_up_date`

**Request:**
```
POST /api/pages/general/:id
```

**Request Body:**
```json
{
  "call_status": "Called",
  "lead_status": "Not Interested",
  "remarks": "Direct to reports"
}
```

**Expected Response:**
```json
{
  "message": "General lead updated and moved to reports",
  "report": { ... }
}
```

**Result**: Lead moves **directly to Reports** (skips FollowUps)

---

### **Test 3: Verify Reports Filter by Category**

**Request:**
```
GET /api/reports?leadType=general
```

**Expected**: All reports with `leadType=general` are returned, including:
- Reports from direct Lead updates (no category)
- Reports from FollowUps (category="followup")

Both should appear in the "general/new leads group" based on `lead_type`

---

## Complete Test Flow Summary

```
1. GET /api/pages/leads
   ↓ (Find a lead)
   
2. POST /api/pages/general/:id
   Body: { "follow_up_date": "2025-01-15T..." }
   ↓ (Lead moves to FollowUps)
   
3. GET /api/pages/follow-ups/:id
   ↓ (Verify in FollowUps)
   
4. POST /api/pages/follow-ups/:id
   Body: { "call_status": "...", "lead_status": "...", "remarks": "...", "call_duration": 300 }
   ↓ (Lead moves to Reports)
   
5. GET /api/reports?leadType=general
   ↓ (Verify in Reports with leadType filter)
```

---

## Troubleshooting

### Issue: Lead not moving to FollowUps
- **Check**: Is `follow_up_date` in the request body?
- **Check**: Is the date format correct? (ISO 8601: `2025-01-15T10:00:00.000Z`)
- **Check**: Server logs for errors

### Issue: Lead not moving to Reports
- **Check**: Is the lead actually in FollowUps? (GET `/api/pages/follow-ups/:id`)
- **Check**: Are `call_status` and `lead_status` provided?
- **Check**: Server logs for report creation errors

### Issue: Report not showing in Reports API
- **Check**: Filter by `leadType=general` (or the original leadType)
- **Check**: Report has `category: "followup"`
- **Check**: Report has `lead_type: "general"` (or matching leadType)

### Issue: "Follow-up lead not found" when updating
- **Reason**: Lead was already moved to Reports
- **Solution**: Check Reports collection instead

---

## Server Logs to Monitor

When testing, watch the server console for these logs:

**Step 2 (Lead → FollowUps):**
- No specific logs (but check response message)

**Step 4 (FollowUps → Reports):**
```
🔍 Looking up FollowUp with ID: ...
✅ FollowUp found: ... (name), (phone), leadType: general
📝 Creating report for FollowUp ID: ...
✅ Report created successfully with ID: ...
   Report category: followup
   Report lead_type: general
✅ FollowUp ID ... removed from FollowUps collection
```

If you see errors, they will be logged with full stack traces.

---

## Postman Collection Structure

Recommended folder structure:

```
📁 Follow-Up Lifecycle Tests
  ├── 📁 Step 1: Get Lead
  │   └── GET Get General Leads
  ├── 📁 Step 2: Move to FollowUps
  │   └── POST Update Lead with Follow-up Date
  ├── 📁 Step 3: Verify in FollowUps
  │   ├── GET Get FollowUps List
  │   ├── GET Get FollowUp by ID
  │   └── GET Verify Not in Leads
  ├── 📁 Step 4: Move to Reports
  │   └── POST Update FollowUp
  └── 📁 Step 5: Verify in Reports
      ├── GET Get Reports (leadType=general)
      ├── GET Get Report by ID
      └── GET Verify Not in FollowUps
```

---

## Quick Test Script

**Minimal test to verify flow works:**

1. **Get a lead**: `GET /api/pages/leads?leadType=general&limit=1`
2. **Move to FollowUps**: `POST /api/pages/general/{id}` with `{"follow_up_date": "2025-01-15T10:00:00.000Z"}`
3. **Verify in FollowUps**: `GET /api/pages/follow-ups/{id}`
4. **Move to Reports**: `POST /api/pages/follow-ups/{id}` with `{"call_status": "Called", "lead_status": "Interested", "remarks": "Test", "call_duration": 60}`
5. **Verify in Reports**: `GET /api/reports?leadType=general` (should see the report)

---

## Expected Database State After Complete Flow

**Before Step 2:**
- ✅ Lead exists in `leads` collection
- ❌ Lead does NOT exist in `followups` collection
- ❌ Lead does NOT exist in `reports` collection

**After Step 2 (Before Step 4):**
- ❌ Lead does NOT exist in `leads` collection
- ✅ Lead exists in `followups` collection
- ❌ Lead does NOT exist in `reports` collection

**After Step 4:**
- ❌ Lead does NOT exist in `leads` collection
- ❌ Lead does NOT exist in `followups` collection
- ✅ Report exists in `reports` collection with:
  - `category: "followup"`
  - `lead_type: "general"` (or original leadType)
  - All updated fields

---

This guide covers the complete Follow-Up lifecycle testing in Postman. Use it to verify each stage of the flow works correctly.

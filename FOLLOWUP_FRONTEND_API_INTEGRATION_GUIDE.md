# Follow-Up Lifecycle - Frontend API Integration Guide

Complete API reference for integrating the 3-stage lead lifecycle (Leads → FollowUps → Reports) in your frontend application.

---

## Table of Contents

1. [Authentication](#authentication)
2. [Base URL & Headers](#base-url--headers)
3. [Complete Lifecycle Flow](#complete-lifecycle-flow)
4. [API Endpoints Reference](#api-endpoints-reference)
5. [Error Handling](#error-handling)
6. [Field Requirements](#field-requirements)
7. [Date Format Guidelines](#date-format-guidelines)

---

## Authentication

All API endpoints require JWT authentication. Include the token in the `Authorization` header.

**Get Token:**
```http
POST https://telecallerappbackend.onrender.com/api/auth/login
Content-Type: application/json

{
  "employeeId": "EMP001",
  "password": "your_password"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "6948e538eda3c7df22d9a452",
    "name": "John Doe",
    "role": "telecaller"
  }
}
```

---

## Base URL & Headers

**Base URL:** `https://telecallerappbackend.onrender.com`

**Required Headers for All Requests:**
```javascript
{
  "Authorization": "Bearer YOUR_JWT_TOKEN",
  "Content-Type": "application/json"
}
```

---

## Complete Lifecycle Flow

### **Stage 1: Leads Collection** → **Stage 2: FollowUps Collection** → **Stage 3: Reports Collection**

```
┌─────────────┐
│   LEADS     │  (Initial state - leads from sync/import)
└──────┬──────┘
       │
       │ User edits lead with follow_up_flag=true + follow_up_date
       │
       ▼
┌─────────────┐
│  FOLLOWUPS  │  (Awaiting follow-up call)
└──────┬──────┘
       │
       │ User completes follow-up call and saves
       │
       ▼
┌─────────────┐
│   REPORTS   │  (Final state - sorted by lead_type)
└─────────────┘
```

---

## API Endpoints Reference

### **1. Get Leads from Leads Collection**

**Purpose:** Fetch leads that can be moved to FollowUps

**Endpoint:**
```http
GET https://telecallerappbackend.onrender.com/api/pages/leads
```

**Query Parameters:**
- `leadType` (optional): `"general" | "lossOfSale" | "return" | "bookingConfirmation" | "justDial"`
- `store` (optional): `"Suitor Guy - Edappally"` (Brand - Location format)
- `callStatus` (optional): Filter by call status
- `leadStatus` (optional): Filter by lead status
- `page` (optional): Page number (default: 1)
- `limit` (optional): Records per page (default: 100)
- `sortBy` (optional): `"createdAt" | "enquiryDate" | "functionDate" | "name" | "store"` (default: "createdAt")
- `sortOrder` (optional): `"asc" | "desc"` (default: "desc")

**Example Request:**
```javascript
const response = await fetch('https://telecallerappbackend.onrender.com/api/pages/leads?leadType=general&page=1&limit=20', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
```

**Example Response:**
```json
{
  "leads": [
    {
      "id": "6953703ba40f84cea542ccc4",
      "lead_name": "John Doe",
      "phone_number": "9876543210",
      "store": "Suitor Guy - Edappally",
      "lead_type": "general",
      "call_status": "Not Called",
      "lead_status": "No Status",
      "enquiry_date": "2024-12-20T10:00:00.000Z",
      "function_date": null,
      "booking_number": null,
      "created_at": "2024-12-20T10:00:00.000Z",
      "assigned_to": {
        "id": "6948e538eda3c7df22d9a452",
        "name": "Telecaller Name",
        "employee_id": "EMP001"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  }
}
```

---

### **2. Get Single Lead by ID**

**Purpose:** Fetch detailed information about a specific lead before editing

**Endpoint:**
```http
GET https://telecallerappbackend.onrender.com/api/pages/leads/:id
```

**Example Request:**
```javascript
const leadId = "6953703ba40f84cea542ccc4";
const response = await fetch(`https://telecallerappbackend.onrender.com/api/pages/leads/${leadId}`, {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
```

**Example Response:**
```json
{
  "id": "6953703ba40f84cea542ccc4",
  "lead_name": "John Doe",
  "phone_number": "9876543210",
  "store": "Suitor Guy - Edappally",
  "lead_type": "general",
  "call_status": "Not Called",
  "lead_status": "No Status",
  "enquiry_date": "2024-12-20T10:00:00.000Z",
  "function_date": null,
  "booking_number": null,
  "created_at": "2024-12-20T10:00:00.000Z"
}
```

---

### **3. Move Lead to FollowUps Collection**

**Purpose:** Update a lead with `follow_up_flag=true` and `follow_up_date` to move it to FollowUps

**⚠️ CRITICAL RULE:** When `follow_up_flag` is `true`, `follow_up_date` is **REQUIRED**. The API will return a 400 error if the date is missing.

**Endpoints (Choose based on lead type):**

#### **Option A: Generic Endpoint (Works for ALL lead types)**
```http
PATCH https://telecallerappbackend.onrender.com/api/pages/leads/:id
```
or
```http
POST https://telecallerappbackend.onrender.com/api/pages/leads/:id
```

#### **Option B: Type-Specific Endpoints**

- **General Leads:**
  ```http
  POST https://telecallerappbackend.onrender.com/api/pages/general/:id
  ```

- **Loss of Sale Leads:**
  ```http
  POST https://telecallerappbackend.onrender.com/api/pages/loss-of-sale/:id
  ```

- **Return Leads:**
  ```http
  POST https://telecallerappbackend.onrender.com/api/pages/return/:id
  ```

- **Booking Confirmation Leads:**
  ```http
  POST https://telecallerappbackend.onrender.com/api/pages/booking-confirmation/:id
  ```

- **Just Dial Leads:**
  ```http
  POST https://telecallerappbackend.onrender.com/api/pages/just-dial/:id
  ```

**Request Body:**
```json
{
  "call_status": "Not Called",
  "lead_status": "No Status",
  "follow_up_flag": true,
  "follow_up_date": "2025-01-15T10:00:00.000Z",
  "remarks": null,
  "call_duration": 0
}
```

**Note:** `remarks` is optional. Include it only if the user provides input:
- If user provides remarks: `"remarks": "User's input text"`
- If user provides no remarks: `"remarks": null` or omit the field entirely

**⚠️ Important Notes:**
- `follow_up_flag: true` **REQUIRES** `follow_up_date` to be provided
- If `follow_up_date` is provided without `follow_up_flag`, the flag is automatically set to `true`
- The date must be in ISO 8601 format (e.g., `"2025-01-15T10:00:00.000Z"`)
- The date should be selected by the telecaller from frontend (not auto-generated)

**Example Request (Generic Endpoint):**
```javascript
const leadId = "6953703ba40f84cea542ccc4";
const followUpDate = new Date('2025-01-15T10:00:00.000Z').toISOString();
const userRemarks = getUserRemarksInput(); // Get remarks from user input (can be null or empty string)

// Build request body - only include remarks if user provided input
const requestBody = {
  call_status: "Not Called",
  lead_status: "No Status",
  follow_up_flag: true,
  follow_up_date: followUpDate,
  call_duration: 0
};

// Only add remarks if user provided input
if (userRemarks && userRemarks.trim() !== '') {
  requestBody.remarks = userRemarks.trim();
} else {
  requestBody.remarks = null; // Explicitly set to null if no input
}

const response = await fetch(`https://telecallerappbackend.onrender.com/api/pages/leads/${leadId}`, {
  method: 'PATCH',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(requestBody)
});
```

**Success Response (200):**
```json
{
  "message": "Lead updated and moved to follow-ups",
  "followUp": {
    "_id": "6953703ba40f84cea542ccc4",
    "name": "John Doe",
    "phone": "9876543210",
    "store": "Suitor Guy - Edappally",
    "leadType": "general",
    "followUpDate": "2025-01-15T10:00:00.000Z",
    "followUpFlag": true,
    "movedToFollowUpAt": "2024-12-31T14:00:00.000Z",
    "movedToFollowUpBy": "6948e538eda3c7df22d9a452",
    "callStatus": "Not Called",
    "leadStatus": "No Status",
    "remarks": null,
    "callDuration": 0,
    "createdAt": "2024-12-20T10:00:00.000Z"
  }
}
```

**Error Response (400) - Missing Date:**
```json
{
  "message": "follow_up_date is required when follow_up_flag is true. Please provide the follow-up date from frontend."
}
```

**Error Response (400) - Invalid Date Format:**
```json
{
  "message": "Invalid follow_up_date format. Must be a valid date (ISO 8601 format)."
}
```

**What Happens:**
- Lead is **removed** from Leads collection
- Lead is **moved** to FollowUps collection
- **NO Report is created** at this stage
- `followUpDate` is preserved exactly as provided by frontend

---

### **4. Get FollowUps Collection**

**Purpose:** Fetch all leads that are in the FollowUps collection (awaiting follow-up calls)

**Endpoint:**
```http
GET https://telecallerappbackend.onrender.com/api/pages/follow-ups
```

**Query Parameters:** (Same as `/api/pages/leads`)
- `leadType` (optional): Filter by lead type
- `store` (optional): Filter by store
- `callStatus` (optional): Filter by call status
- `leadStatus` (optional): Filter by lead status
- `page` (optional): Page number (default: 1)
- `limit` (optional): Records per page (default: 100)
- `sortBy` (optional): Sort field (default: "createdAt")
- `sortOrder` (optional): `"asc" | "desc"` (default: "desc")

**Example Request:**
```javascript
const response = await fetch('https://telecallerappbackend.onrender.com/api/pages/follow-ups?leadType=general&page=1&limit=20', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
```

**Example Response:**
```json
{
  "leads": [
    {
      "id": "6953703ba40f84cea542ccc4",
      "lead_name": "John Doe",
      "phone_number": "9876543210",
      "store": "Suitor Guy - Edappally",
      "lead_type": "general",
      "call_status": "Not Called",
      "lead_status": "No Status",
      "follow_up_date": "2025-01-15T10:00:00.000Z",
      "call_duration": 0,
      "remarks": null,
      "created_at": "2024-12-20T10:00:00.000Z",
      "movedToFollowUpAt": "2024-12-31T14:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "pages": 3
  }
}
```

**Key Fields:**
- `follow_up_date`: The date selected by telecaller when moving to FollowUps
- `movedToFollowUpAt`: Timestamp when lead was moved to FollowUps
- All other fields are preserved from the original lead

---

### **5. Get Single FollowUp Lead by ID**

**Purpose:** Fetch detailed information about a specific FollowUp lead before completing the follow-up call

**Endpoint:**
```http
GET https://telecallerappbackend.onrender.com/api/pages/follow-ups/:id
```

**Example Request:**
```javascript
const followUpId = "6953703ba40f84cea542ccc4";
const response = await fetch(`https://telecallerappbackend.onrender.com/api/pages/follow-ups/${followUpId}`, {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
```

**Example Response:**
```json
{
  "id": "6953703ba40f84cea542ccc4",
  "lead_name": "John Doe",
  "phone_number": "9876543210",
  "store": "Suitor Guy - Edappally",
  "lead_type": "general",
  "call_status": "Not Called",
  "lead_status": "No Status",
  "follow_up_date": "2025-01-15T10:00:00.000Z",
  "call_duration": 0,
  "remarks": null,
  "created_at": "2024-12-20T10:00:00.000Z",
  "movedToFollowUpAt": "2024-12-31T14:00:00.000Z"
}
```

---

### **6. Complete Follow-Up Call and Move to Reports**

**Purpose:** Update a FollowUp lead with call details and move it to Reports collection (final state)

**⚠️ CRITICAL:** This endpoint **ONLY** works with leads in the FollowUps collection. If the lead is not found in FollowUps, it returns a 404 error.

**Endpoint:**
```http
POST https://telecallerappbackend.onrender.com/api/pages/follow-ups/:id
```

**Request Body:**
```json
{
  "call_status": "Connected",
  "lead_status": "Interested",
  "remarks": null,
  "call_duration": 300
}
```

**Note:** `remarks` is optional. Include it only if the user provides input:
- If user provides remarks: `"remarks": "User's input text"`
- If user provides no remarks: `"remarks": null` or omit the field entirely

**Required Fields:**
- `call_status`: Updated call status (e.g., "Connected", "Not Answered", "Busy")
- `lead_status`: Updated lead status (e.g., "Interested", "Not Interested", "Confirmed")

**Optional Fields:**
- `remarks`: Updated remarks. **Only include if user provides input.** If no input, use `null`. Max 1000 characters if provided.
- `call_duration`: Call duration in seconds (number, default: 0)
- `follow_up_date`: Can be updated if needed (preserves existing if not provided)

**Example Request:**
```javascript
const followUpId = "6953703ba40f84cea542ccc4";
const callDuration = 300; // 5 minutes in seconds
const userRemarks = getUserRemarksInput(); // Get remarks from user input (can be null or empty string)

// Build request body - only include remarks if user provided input
const requestBody = {
  call_status: "Connected",
  lead_status: "Interested",
  call_duration: callDuration
};

// Only add remarks if user provided input
if (userRemarks && userRemarks.trim() !== '') {
  requestBody.remarks = userRemarks.trim();
} else {
  requestBody.remarks = null; // Explicitly set to null if no input
}

const response = await fetch(`https://telecallerappbackend.onrender.com/api/pages/follow-ups/${followUpId}`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(requestBody)
});
```

**Success Response (200):**
```json
{
  "message": "Follow-up lead updated and moved to reports",
  "report": {
    "_id": "6954ec119fcf2358f8ea164d",
    "lead_name": "John Doe",
    "phone_number": "9876543210",
    "store": "Suitor Guy - Edappally",
    "lead_type": "general",
    "call_status": "Connected",
    "lead_status": "Interested",
    "call_duration": 300,
    "remarks": null,
    "follow_up_date": "2025-01-15T10:00:00.000Z",
    "editedBy": "6948e538eda3c7df22d9a452",
    "editedAt": "2024-12-31T15:00:00.000Z",
    "created_at": "2024-12-20T10:00:00.000Z"
  }
}
```

**Report Sorting:**
- Reports are sorted by `lead_type` field:
  - `"general"` → General/New Leads section
  - `"lossOfSale"` → Loss of Sale section
  - `"bookingConfirmation"` → Booking section
  - `"return"` → Return section
  - `"justDial"` → Just Dial section
- The `lead_type` from FollowUp is explicitly preserved in the Report
- No `category` field is used - sorting is based solely on `lead_type`

**Key Points:**
- Reports are sorted by `lead_type` (general, lossOfSale, bookingConfirmation, return, justDial)
- The `lead_type` from FollowUp is explicitly preserved in the Report for proper sorting
- All fields (callStatus, leadStatus, callDuration, remarks, leadType, store) are preserved
- FollowUp lead is **removed** from FollowUps collection
- Report entry is **created** in Reports collection
- Reports appear in the correct section based on `lead_type` (General, Loss of Sale, Booking, Return, All Calls)

**Error Response (404) - Not in FollowUps:**
```json
{
  "message": "Follow-up lead not found. This endpoint only works with leads in the FollowUps collection."
}
```

**Error Response (400) - Validation Error:**
```json
{
  "message": "Remarks field cannot exceed 1000 characters"
}
```

---

## Error Handling

### **Common HTTP Status Codes:**

- **200 OK:** Request successful
- **201 Created:** Resource created successfully
- **400 Bad Request:** Validation error (missing/invalid fields)
- **401 Unauthorized:** Missing or invalid JWT token
- **403 Forbidden:** User doesn't have permission
- **404 Not Found:** Resource not found
- **500 Internal Server Error:** Server error

### **Error Response Format:**
```json
{
  "message": "Error description here"
}
```

### **Frontend Error Handling Example:**
```javascript
try {
  const response = await fetch(url, options);
  const data = await response.json();
  
  if (!response.ok) {
    if (response.status === 400) {
      // Validation error - show user-friendly message
      alert(`Validation Error: ${data.message}`);
    } else if (response.status === 401) {
      // Unauthorized - redirect to login
      window.location.href = '/login';
    } else if (response.status === 404) {
      // Not found - show error message
      alert(`Not Found: ${data.message}`);
    } else {
      // Other errors
      alert(`Error: ${data.message}`);
    }
    return;
  }
  
  // Success - handle data
  console.log('Success:', data);
} catch (error) {
  console.error('Network error:', error);
  alert('Network error. Please check your connection.');
}
```

---

## Field Requirements

### **When Moving Lead to FollowUps:**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `follow_up_flag` | boolean | **Yes** (if true) | Must be `true` to move to FollowUps |
| `follow_up_date` | string (ISO 8601) | **Yes** (if flag=true) | **REQUIRED** when `follow_up_flag` is `true` |
| `call_status` | string | Optional | Current call status |
| `lead_status` | string | Optional | Current lead status |
| `remarks` | string \| null | Optional | **Only include if user provides input.** If no input, use `null`. Max 1000 characters if provided. |
| `call_duration` | number | Optional | Duration in seconds (default: 0) |

### **When Completing Follow-Up Call:**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `call_status` | string | **Yes** | Updated call status |
| `lead_status` | string | **Yes** | Updated lead status |
| `remarks` | string \| null | Optional | **Only include if user provides input.** If no input, use `null`. Max 1000 characters if provided. |
| `call_duration` | number | Optional | Duration in seconds (default: 0) |
| `follow_up_date` | string (ISO 8601) | Optional | Can update if needed |

---

## Date Format Guidelines

### **ISO 8601 Format (Required):**

All dates must be in ISO 8601 format: `YYYY-MM-DDTHH:mm:ss.sssZ`

**Examples:**
- `"2025-01-15T10:00:00.000Z"` (UTC)
- `"2025-01-15T10:00:00.000+05:30"` (IST with timezone offset)

### **JavaScript Date Conversion:**

```javascript
// Convert Date object to ISO string
const date = new Date('2025-01-15T10:00:00');
const isoString = date.toISOString(); // "2025-01-15T10:00:00.000Z"

// Convert user-selected date to ISO string
const userDate = new Date('2025-01-15'); // From date picker
const isoString = userDate.toISOString(); // "2025-01-15T00:00:00.000Z"

// Handle timezone (if needed)
const localDate = new Date('2025-01-15T10:00:00+05:30'); // IST
const utcString = localDate.toISOString(); // Converts to UTC
```

### **Frontend Date Picker Integration:**

```javascript
// Example: React date picker
import DatePicker from 'react-datepicker';

const [followUpDate, setFollowUpDate] = useState(null);

// When user selects date
const handleDateChange = (date) => {
  setFollowUpDate(date);
};

// When submitting
const handleSubmit = async () => {
  const isoDate = followUpDate ? followUpDate.toISOString() : null;
  
  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      follow_up_flag: true,
      follow_up_date: isoDate,
      // ... other fields
    })
  });
};
```

---

## Complete Integration Example

### **React/JavaScript Example:**

```javascript
// 1. Get leads from Leads collection
const fetchLeads = async (token) => {
  const response = await fetch('https://telecallerappbackend.onrender.com/api/pages/leads?leadType=general', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  const data = await response.json();
  return data.leads;
};

// 2. Move lead to FollowUps
const moveToFollowUps = async (leadId, followUpDate, userRemarks, token) => {
  // Build request body - only include remarks if user provided input
  const requestBody = {
    follow_up_flag: true,
    follow_up_date: followUpDate.toISOString(),
    call_status: "Not Called",
    lead_status: "No Status",
    call_duration: 0
  };
  
  // Only add remarks if user provided input
  if (userRemarks && userRemarks.trim() !== '') {
    requestBody.remarks = userRemarks.trim();
  } else {
    requestBody.remarks = null; // Explicitly set to null if no input
  }
  
  const response = await fetch(`https://telecallerappbackend.onrender.com/api/pages/leads/${leadId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }
  
  return await response.json();
};

// 3. Get FollowUps
const fetchFollowUps = async (token) => {
  const response = await fetch('https://telecallerappbackend.onrender.com/api/pages/follow-ups', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  const data = await response.json();
  return data.leads;
};

// 4. Complete follow-up call and move to Reports
const completeFollowUp = async (followUpId, callDetails, token) => {
  // Build request body - only include remarks if user provided input
  const requestBody = {
    call_status: callDetails.callStatus,
    lead_status: callDetails.leadStatus,
    call_duration: callDetails.callDuration || 0
  };
  
  // Only add remarks if user provided input
  if (callDetails.remarks && callDetails.remarks.trim() !== '') {
    requestBody.remarks = callDetails.remarks.trim();
  } else {
    requestBody.remarks = null; // Explicitly set to null if no input
  }
  
  const response = await fetch(`https://telecallerappbackend.onrender.com/api/pages/follow-ups/${followUpId}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }
  
  return await response.json();
};
```

---

## Summary

### **Complete Flow:**

1. **Fetch Leads:** `GET https://telecallerappbackend.onrender.com/api/pages/leads`
2. **Move to FollowUps:** `PATCH https://telecallerappbackend.onrender.com/api/pages/leads/:id` with `follow_up_flag=true` + `follow_up_date`
3. **Fetch FollowUps:** `GET https://telecallerappbackend.onrender.com/api/pages/follow-ups`
4. **Complete Follow-Up:** `POST https://telecallerappbackend.onrender.com/api/pages/follow-ups/:id` with call details
5. **Result:** Lead is now in Reports collection, sorted by `lead_type` (general, lossOfSale, bookingConfirmation, return, justDial)

### **Key Rules:**

✅ When `follow_up_flag` is `true`, `follow_up_date` is **REQUIRED**  
✅ `follow_up_date` must be in ISO 8601 format  
✅ `follow_up_date` should come from frontend (user-selected), not auto-generated  
✅ FollowUps endpoint only works with leads in FollowUps collection  
✅ Reports created from FollowUps are sorted by `lead_type` (general, lossOfSale, bookingConfirmation, return, justDial)  

---

## Support

For issues or questions, refer to:
- Swagger Documentation: `https://telecallerappbackend.onrender.com/api-docs`
- Postman Guide: `FOLLOWUP_LIFECYCLE_POSTMAN_GUIDE.md`

# 📋 Postman Guide: How to Check Return Leads

## Overview
This guide shows you how to use Postman to check return leads in your Telecaller Backend system.

---

## 🔐 Step 1: Authentication (Get Token)

Before accessing return leads, you need to authenticate and get a Bearer token.

### Login Request
```
POST {{base_url}}/api/auth/login
```

**Request Body (JSON):**
```json
{
  "email": "your-email@example.com",
  "password": "your-password"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "...",
    "name": "...",
    "role": "admin"
  }
}
```

**Copy the `token` value** - you'll need it for all subsequent requests.

---

## 📊 Step 2: Get List of Return Leads

### Basic Request - All Return Leads
```
GET {{base_url}}/api/pages/leads?leadType=return
```

**Headers:**
```
Authorization: Bearer YOUR_TOKEN_HERE
```

**Response Example:**
```json
{
  "leads": [
    {
      "id": "67890abcdef",
      "lead_name": "John Doe",
      "phone_number": "9876543210",
      "store": "Suitor Guy - Edappally",
      "lead_type": "return",
      "call_status": "pending",
      "lead_status": "new",
      "function_date": "2024-03-15T00:00:00.000Z",
      "enquiry_date": "2024-01-10T00:00:00.000Z",
      "created_at": "2024-12-22T10:30:00.000Z",
      "booking_number": "BK12345",
      "return_date": "2024-03-20T00:00:00.000Z",
      "attended_by": "Store Manager",
      "assigned_to": {
        "id": "user123",
        "name": "Jane Smith",
        "employee_id": "EMP001"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 100,
    "total": 45,
    "pages": 1
  }
}
```

---

## 🔍 Step 3: Filter Return Leads

### Filter by Store
```
GET {{base_url}}/api/pages/leads?leadType=return&store=Suitor Guy - Edappally
```

### Filter by Store (Location Only)
```
GET {{base_url}}/api/pages/leads?leadType=return&store=Kottayam
```

### Filter by Return Date Range
```
GET {{base_url}}/api/pages/leads?leadType=return&functionDateFrom=2024-03-01&functionDateTo=2024-03-31
```

### Filter by Creation Date (Single Day)
```
GET {{base_url}}/api/pages/leads?leadType=return&createdAt=2024-12-22
```

### Filter by Call Status
```
GET {{base_url}}/api/pages/leads?leadType=return&callStatus=connected
```

### Filter by Lead Status
```
GET {{base_url}}/api/pages/leads?leadType=return&leadStatus=confirmed
```

### Combined Filters (Store + Date Range)
```
GET {{base_url}}/api/pages/leads?leadType=return&store=Suitor Guy - Kottayam&functionDateFrom=2024-03-01&functionDateTo=2024-03-31
```

### Sort by Return Date (Newest First)
```
GET {{base_url}}/api/pages/leads?leadType=return&sortBy=functionDate&sortOrder=desc
```

### Sort by Name (Alphabetical)
```
GET {{base_url}}/api/pages/leads?leadType=return&sortBy=name&sortOrder=asc
```

---

## 📄 Step 4: Get Single Return Lead Details

Once you have a lead ID from the list, you can get detailed information:

```
GET {{base_url}}/api/pages/return/{lead_id}
```

**Example:**
```
GET {{base_url}}/api/pages/return/67890abcdef
```

**Headers:**
```
Authorization: Bearer YOUR_TOKEN_HERE
```

**Response:**
```json
{
  "lead_name": "John Doe",
  "phone_number": "9876543210",
  "booking_number": "BK12345",
  "return_date": "2024-03-20T00:00:00.000Z",
  "attended_by": "Store Manager"
}
```

---

## ✏️ Step 5: Update Return Lead

Update a return lead's call status, lead status, and remarks:

```
POST {{base_url}}/api/pages/return/{lead_id}
```

**Headers:**
```
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json
```

**Request Body:**
```json
{
  "call_status": "connected",
  "lead_status": "confirmed",
  "follow_up_flag": true,
  "remarks": "Customer confirmed return. Items in good condition."
}
```

**Response:**
```json
{
  "message": "Return lead updated and moved to reports",
  "report": {
    "_id": "report123",
    "lead_name": "John Doe",
    "phone_number": "9876543210",
    "call_status": "connected",
    "lead_status": "confirmed",
    "editedBy": "user123",
    "editedAt": "2024-12-22T11:00:00.000Z"
  }
}
```

**Note:** After updating, the lead is moved to the Reports collection.

---

## 🎯 Common Use Cases

### 1. Today's Return Leads
```
GET {{base_url}}/api/pages/leads?leadType=return&createdAt=2024-12-22
```

### 2. Return Leads for Specific Store (This Month)
```
GET {{base_url}}/api/pages/leads?leadType=return&store=Suitor Guy - Edappally&functionDateFrom=2024-12-01&functionDateTo=2024-12-31
```

### 3. Pending Return Leads
```
GET {{base_url}}/api/pages/leads?leadType=return&callStatus=pending
```

### 4. Return Leads with Specific Booking Number
Search by booking number in the list response, or filter by phone if you know it:
```
GET {{base_url}}/api/pages/leads?leadType=return&phone=9876543210
```

### 5. Return Leads Assigned to Specific User
```
GET {{base_url}}/api/pages/leads?leadType=return&assignedTo=user123
```

---

## 🔧 Postman Environment Variables

Create a Postman environment with these variables:

| Variable | Value | Description |
|----------|-------|-------------|
| `base_url` | `http://localhost:5000` | Local development |
| `base_url` | `https://your-api.com` | Production |
| `token` | `Bearer eyJhbG...` | Auth token (set after login) |

**How to use:**
1. Create new environment in Postman
2. Add `base_url` variable
3. After login, manually add `token` variable with the Bearer token
4. Select the environment before making requests

---

## 📝 Field Descriptions

### Return Lead Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | String | Unique lead identifier |
| `lead_name` | String | Customer name |
| `phone_number` | String | Customer phone |
| `store` | String | Store name (e.g., "Suitor Guy - Edappally") |
| `lead_type` | String | Always "return" for return leads |
| `call_status` | String | Call status (pending, connected, not_connected, etc.) |
| `lead_status` | String | Lead status (new, confirmed, cancelled, etc.) |
| `booking_number` | String | Original booking reference number |
| `return_date` | Date | Date when items were returned |
| `function_date` | Date | Original function/event date |
| `enquiry_date` | Date | Original enquiry date |
| `attended_by` | String | Store staff who handled the return |
| `created_at` | Date | When lead was created in system |
| `assigned_to` | Object | Telecaller assigned to this lead |

---

## 🚨 Common Errors

### 401 Unauthorized
```json
{
  "message": "Not authorized, token failed"
}
```
**Solution:** Check your Bearer token is correct and not expired. Login again to get a new token.

### 403 Forbidden
```json
{
  "message": "Access denied"
}
```
**Solution:** Your user role doesn't have permission to access this lead. Check with admin.

### 404 Not Found
```json
{
  "message": "Lead not found"
}
```
**Solution:** The lead ID doesn't exist or has been moved to reports.

### 400 Bad Request
```json
{
  "errors": [
    {
      "msg": "Invalid lead ID format",
      "param": "id"
    }
  ]
}
```
**Solution:** Check the lead ID format is correct (MongoDB ObjectId format).

---

## 📚 Additional Resources

### Check Reports (Edited Return Leads)
After updating a return lead, it moves to reports:
```
GET {{base_url}}/api/reports?leadType=return
```

### Swagger Documentation
Access interactive API documentation:
```
http://localhost:5000/api-docs
```

### Verify Sync Status
Check if return data is syncing properly:
```bash
npm run verify:sync
```

---

## 🎓 Quick Start Postman Collection

Here's a ready-to-import Postman collection:

```json
{
  "info": {
    "name": "Return Leads API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "1. Login",
      "request": {
        "method": "POST",
        "header": [{"key": "Content-Type", "value": "application/json"}],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"email\": \"your-email@example.com\",\n  \"password\": \"your-password\"\n}"
        },
        "url": {
          "raw": "{{base_url}}/api/auth/login",
          "host": ["{{base_url}}"],
          "path": ["api", "auth", "login"]
        }
      }
    },
    {
      "name": "2. Get All Return Leads",
      "request": {
        "method": "GET",
        "header": [{"key": "Authorization", "value": "Bearer {{token}}"}],
        "url": {
          "raw": "{{base_url}}/api/pages/leads?leadType=return",
          "host": ["{{base_url}}"],
          "path": ["api", "pages", "leads"],
          "query": [{"key": "leadType", "value": "return"}]
        }
      }
    },
    {
      "name": "3. Get Return Lead by ID",
      "request": {
        "method": "GET",
        "header": [{"key": "Authorization", "value": "Bearer {{token}}"}],
        "url": {
          "raw": "{{base_url}}/api/pages/return/:id",
          "host": ["{{base_url}}"],
          "path": ["api", "pages", "return", ":id"],
          "variable": [{"key": "id", "value": "LEAD_ID_HERE"}]
        }
      }
    },
    {
      "name": "4. Update Return Lead",
      "request": {
        "method": "POST",
        "header": [
          {"key": "Authorization", "value": "Bearer {{token}}"},
          {"key": "Content-Type", "value": "application/json"}
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"call_status\": \"connected\",\n  \"lead_status\": \"confirmed\",\n  \"follow_up_flag\": true,\n  \"remarks\": \"Customer confirmed return\"\n}"
        },
        "url": {
          "raw": "{{base_url}}/api/pages/return/:id",
          "host": ["{{base_url}}"],
          "path": ["api", "pages", "return", ":id"],
          "variable": [{"key": "id", "value": "LEAD_ID_HERE"}]
        }
      }
    },
    {
      "name": "5. Filter by Store",
      "request": {
        "method": "GET",
        "header": [{"key": "Authorization", "value": "Bearer {{token}}"}],
        "url": {
          "raw": "{{base_url}}/api/pages/leads?leadType=return&store=Suitor Guy - Edappally",
          "host": ["{{base_url}}"],
          "path": ["api", "pages", "leads"],
          "query": [
            {"key": "leadType", "value": "return"},
            {"key": "store", "value": "Suitor Guy - Edappally"}
          ]
        }
      }
    }
  ]
}
```

**To import:**
1. Copy the JSON above
2. Open Postman → Import → Raw Text
3. Paste and import
4. Set up environment variables (`base_url` and `token`)

---

## ✅ Summary

**To check return leads in Postman:**

1. **Login** to get authentication token
2. **List return leads** using `GET /api/pages/leads?leadType=return`
3. **Filter** by store, date, status as needed
4. **Get details** of specific lead using `GET /api/pages/return/{id}`
5. **Update** lead using `POST /api/pages/return/{id}`

**Base URL:** `http://localhost:5000` (development) or your production URL

**All requests require:** `Authorization: Bearer YOUR_TOKEN` header

---

**Last Updated:** December 22, 2024  
**Version:** 1.0  
**Status:** Production Ready 🚀

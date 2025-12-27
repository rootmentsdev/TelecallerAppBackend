# How to Get Today's Reports - Quick Guide

## 📊 Summary
There are multiple ways to get today's reports depending on what you want to measure:

### 1. **Work Done Today** (Most Common)
Shows reports that were edited/processed today by telecallers.

**API Endpoint:**
```
GET /api/reports?editedAtFrom=2025-12-27&editedAtTo=2025-12-27
```

**Postman URL:**
```
https://telecallerappbackend.onrender.com/api/reports?editedAtFrom=2025-12-27&editedAtTo=2025-12-27
```

### 2. **Call Summary for Today**
Shows call status breakdown for work completed today.

**API Endpoint:**
```
GET /api/reports/call-summary?date=2025-12-27
```

**Postman URL:**
```
https://telecallerappbackend.onrender.com/api/reports/call-summary?date=2025-12-27
```

### 3. **Store-Specific Reports for Today**
Shows today's work for a specific store.

**API Endpoint:**
```
GET /api/reports?editedAtFrom=2025-12-27&editedAtTo=2025-12-27&store=Suitor Guy - Calicut
```

**Postman URL:**
```
https://telecallerappbackend.onrender.com/api/reports?editedAtFrom=2025-12-27&editedAtTo=2025-12-27&store=Suitor Guy - Calicut
```

### 4. **Reports for Leads Created Today**
Shows reports for leads that were originally created today (regardless of when they were edited).

**API Endpoint:**
```
GET /api/reports?createdAt=2025-12-27
```

## 🔧 Quick Script
Run the demonstration script to see live data:
```bash
node get-todays-reports.js
```

## 📝 Key Points

### Date Parameters
- **`editedAtFrom/editedAtTo`**: When the report was created (work done)
- **`createdAt`**: When the original lead was created
- **`dateFrom/dateTo`**: Legacy parameters (maps to editedAt)

### Use Cases
- **Daily Productivity**: Use `editedAtFrom/editedAtTo`
- **Call Summary**: Use `/call-summary?date=YYYY-MM-DD`
- **Lead Creation Tracking**: Use `createdAt`
- **Store Performance**: Add `&store=Store Name`

### Response Format
```json
{
  "reports": [...],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 25,
    "pages": 1
  }
}
```

### Call Summary Response
```json
{
  "connected": 21,
  "not_connected": 9,
  "call_back_later": 2,
  "confirmed": 3
}
```

## 🌐 Live Examples
Replace `2025-12-27` with today's date in YYYY-MM-DD format:

1. **Today's Work Summary**: `https://telecallerappbackend.onrender.com/api/reports/call-summary?date=2025-12-27`
2. **Today's Reports List**: `https://telecallerappbackend.onrender.com/api/reports?editedAtFrom=2025-12-27&editedAtTo=2025-12-27`
3. **Store-Specific**: `https://telecallerappbackend.onrender.com/api/reports?editedAtFrom=2025-12-27&editedAtTo=2025-12-27&store=Suitor Guy - Calicut`
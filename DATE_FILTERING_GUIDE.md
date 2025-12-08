# Date Filtering Guide for Leads API

## Endpoint
`GET /api/pages/leads`

## Date Filtering Parameters

The API supports multiple date filtering options. All dates should be in `YYYY-MM-DD` format.

---

## 1. Enquiry Date Filtering

Filter leads based on their enquiry date.

### Parameters:
- `enquiryDateFrom` - Filter leads with enquiry date on or after this date
- `enquiryDateTo` - Filter leads with enquiry date on or before this date

### Examples:

**Get leads with enquiry date from January 1, 2024:**
```
GET /api/pages/leads?enquiryDateFrom=2024-01-01
```

**Get leads with enquiry date up to December 31, 2024:**
```
GET /api/pages/leads?enquiryDateTo=2024-12-31
```

**Get leads with enquiry date between January 1 and December 31, 2024:**
```
GET /api/pages/leads?enquiryDateFrom=2024-01-01&enquiryDateTo=2024-12-31
```

**With leadType and store:**
```
GET /api/pages/leads?leadType=bookingConfirmation&store=Suitor Guy - Edappally&enquiryDateFrom=2024-01-01&enquiryDateTo=2024-12-31
```

---

## 2. Function Date Filtering

Filter leads based on their function/event date.

### Parameters:
- `functionDateFrom` - Filter leads with function date on or after this date
- `functionDateTo` - Filter leads with function date on or before this date

### Examples:

**Get leads with function date from March 1, 2024:**
```
GET /api/pages/leads?functionDateFrom=2024-03-01
```

**Get leads with function date between March 1 and March 31, 2024:**
```
GET /api/pages/leads?functionDateFrom=2024-03-01&functionDateTo=2024-03-31
```

**With leadType:**
```
GET /api/pages/leads?leadType=rentOutFeedback&functionDateFrom=2024-03-01&functionDateTo=2024-03-31
```

---

## 3. Visit Date Filtering

Filter leads based on their visit date (mainly for Loss of Sale leads).

### Parameters:
- `visitDateFrom` - Filter leads with visit date on or after this date
- `visitDateTo` - Filter leads with visit date on or before this date

### Examples:

**Get Loss of Sale leads with visit date from February 1, 2024:**
```
GET /api/pages/leads?leadType=lossOfSale&visitDateFrom=2024-02-01
```

**Get Loss of Sale leads with visit date between February 1 and February 28, 2024:**
```
GET /api/pages/leads?leadType=lossOfSale&visitDateFrom=2024-02-01&visitDateTo=2024-02-28
```

---

## 4. Generic Date Range Filtering

Use generic date parameters with a specified date field. This is useful when you want to filter by different date fields dynamically.

### Parameters:
- `dateFrom` - Start date for the range
- `dateTo` - End date for the range
- `dateField` - Which date field to filter (default: `enquiryDate`)
  - Options: `enquiryDate`, `functionDate`, `visitDate`, `createdAt`

### Examples:

**Filter by enquiry date (default):**
```
GET /api/pages/leads?dateFrom=2024-01-01&dateTo=2024-12-31
```

**Filter by function date:**
```
GET /api/pages/leads?dateFrom=2024-03-01&dateTo=2024-03-31&dateField=functionDate
```

**Filter by visit date:**
```
GET /api/pages/leads?dateFrom=2024-02-01&dateTo=2024-02-28&dateField=visitDate
```

**Filter by creation date:**
```
GET /api/pages/leads?dateFrom=2024-01-01&dateTo=2024-12-31&dateField=createdAt
```

---

## Priority Rules

**Specific date fields take priority over generic date range:**

1. If `enquiryDateFrom` or `enquiryDateTo` is provided, it will be used (not `dateFrom`/`dateTo`)
2. If `functionDateFrom` or `functionDateTo` is provided, it will be used
3. If `visitDateFrom` or `visitDateTo` is provided, it will be used
4. Only if none of the specific date fields are provided, `dateFrom`/`dateTo` with `dateField` will be used

---

## Combined Examples

### Example 1: Multiple Filters
```
GET /api/pages/leads?leadType=bookingConfirmation&store=Suitor Guy - Edappally&enquiryDateFrom=2024-01-01&enquiryDateTo=2024-12-31&functionDateFrom=2024-03-01&functionDateTo=2024-03-31
```
This returns booking confirmation leads for Suitor Guy - Edappally with:
- Enquiry date between Jan 1 - Dec 31, 2024
- Function date between Mar 1 - Mar 31, 2024

### Example 2: Store + Date Range
```
GET /api/pages/leads?store=Suitor Guy - Kottayam&enquiryDateFrom=2024-06-01&enquiryDateTo=2024-06-30
```
Returns all leads for Suitor Guy - Kottayam with enquiry date in June 2024

### Example 3: Lead Type + Function Date
```
GET /api/pages/leads?leadType=rentOutFeedback&functionDateFrom=2024-05-01&functionDateTo=2024-05-31
```
Returns rent-out leads with function date in May 2024

### Example 4: Loss of Sale + Visit Date
```
GET /api/pages/leads?leadType=lossOfSale&store=Suitor Guy - Manjeri&visitDateFrom=2024-04-01&visitDateTo=2024-04-30
```
Returns loss of sale leads for Suitor Guy - Manjeri with visit date in April 2024

---

## Date Format

All dates must be in **ISO 8601 format**: `YYYY-MM-DD`

- ✅ Correct: `2024-01-15`
- ❌ Incorrect: `01/15/2024`, `15-01-2024`, `2024/01/15`

---

## Date Range Behavior

- **From dates**: Includes the entire day (starts at 00:00:00)
- **To dates**: Includes the entire day (ends at 23:59:59.999)
- **Both dates are inclusive** in the range

Example: `enquiryDateFrom=2024-01-01&enquiryDateTo=2024-01-31` includes:
- All leads from January 1, 2024 00:00:00
- All leads up to January 31, 2024 23:59:59.999

---

## Complete Parameter List

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `leadType` | string | No | Filter by lead type |
| `store` | string | No | Filter by store name |
| `enquiryDateFrom` | date | No | Enquiry date from (YYYY-MM-DD) |
| `enquiryDateTo` | date | No | Enquiry date to (YYYY-MM-DD) |
| `functionDateFrom` | date | No | Function date from (YYYY-MM-DD) |
| `functionDateTo` | date | No | Function date to (YYYY-MM-DD) |
| `visitDateFrom` | date | No | Visit date from (YYYY-MM-DD) |
| `visitDateTo` | date | No | Visit date to (YYYY-MM-DD) |
| `dateFrom` | date | No | Generic date from (requires dateField) |
| `dateTo` | date | No | Generic date to (requires dateField) |
| `dateField` | string | No | Field for generic date range (default: enquiryDate) |
| `callStatus` | string | No | Filter by call status |
| `leadStatus` | string | No | Filter by lead status |
| `source` | string | No | Filter by source |
| `page` | integer | No | Page number (default: 1) |
| `limit` | integer | No | Records per page (default: 100, max: 1000) |


# Postman Requests for Loss of Sale by Store

This guide provides ready-to-use Postman requests for checking loss of sale leads for each store separately.

---

## Setup

1. **Login first** to get your token:
   ```
   POST http://localhost:8800/api/auth/login
   Body: {
     "employeeId": "emp188",
     "password": "151298"
   }
   ```

2. **Copy the token** from the response

3. **Set Authorization header** in all requests:
   - Go to **Authorization** tab
   - Type: **Bearer Token**
   - Token: Paste your token

---

## Store List (Run the script to get updated list)

Run this command to get the latest list:
```bash
node -e "import('./get-all-stores.js')"
```

Or check the output above for the complete list.

---

## How to Use in Postman

### Method 1: Using Query Parameters (Recommended)

1. **Method**: `GET`
2. **URL**: `http://localhost:8800/api/pages/leads`
3. **Params Tab**:
   - `leadType` = `lossOfSale`
   - `store` = `STORE_NAME_HERE` (use exact store name from list below)
4. **Authorization Tab**: Bearer Token (your token)

### Method 2: Using Full URL

Use the full URL with encoded store name (spaces become `%20`)

---

## Store Requests

*(The script above will generate the complete list. Below is a template format)*

### Example Format:

**Store Name: Suitor Guy - CALICUT (X leads)**
```
GET http://localhost:8800/api/pages/leads?leadType=lossOfSale&store=Suitor%20Guy%20-%20CALICUT
```

**In Postman Params:**
- `leadType` = `lossOfSale`
- `store` = `Suitor Guy - CALICUT`

---

## Quick Tips

1. **Store names are case-sensitive** - Use exact names from the list
2. **Spaces matter** - Postman will auto-encode, but make sure spacing is correct
3. **Check response** - Empty array means 0 leads for that store
4. **Pagination** - Add `&page=1&limit=100` to see more results

---

## Troubleshooting

### Empty Results
- Check if store name matches exactly (case-sensitive)
- Verify you're logged in as admin (or leads are assigned to you)
- Check if that store actually has loss of sale leads

### 403 Forbidden
- Make sure Authorization header is set
- Token might be expired - login again

### Wrong Store Name
- Run the script to get exact store names
- Check database for actual store names

---

## Batch Testing

You can create a Postman Collection with all store requests for easy testing:

1. Create a new Collection in Postman
2. Add a request for each store
3. Use Collection Runner to test all at once
4. Export/Import the collection for team use


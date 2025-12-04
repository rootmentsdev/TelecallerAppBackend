# Postman Requests for Walk-in Leads by Store

This guide provides ready-to-use Postman requests for checking walk-in leads for each store separately.

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

## All Stores with Walk-in Leads

**Total: 18 stores | 689 walk-in leads**

---

## Postman Setup

1. **Method**: `GET`
2. **URL**: `http://localhost:8800/api/pages/leads`
3. **Authorization**: Bearer Token (your login token)
4. **Params tab**:
   - `leadType` = `general`
   - `source` = `Walk-in`
   - `store` = `STORE_NAME` (use exact name from list below)

---

## Store Requests (Sorted by Lead Count)

### Top Stores

1. **Suitor Guy - Edappal (133 leads)**
   - `leadType` = `general`
   - `source` = `Walk-in`
   - `store` = `Suitor Guy - Edappal`

2. **Suitor Guy - Trivandrum (89 leads)**
   - `leadType` = `general`
   - `source` = `Walk-in`
   - `store` = `Suitor Guy - Trivandrum`

3. **Zurocci - Edappal (86 leads)**
   - `leadType` = `general`
   - `source` = `Walk-in`
   - `store` = `Zurocci - Edappal`

4. **Suitor Guy - MG Road (78 leads)**
   - `leadType` = `general`
   - `source` = `Walk-in`
   - `store` = `Suitor Guy - MG Road`

5. **Suitor Guy - Kottayam (50 leads)**
   - `leadType` = `general`
   - `source` = `Walk-in`
   - `store` = `Suitor Guy - Kottayam`

6. **Suitor Guy - KANNUR (42 leads)**
   - `leadType` = `general`
   - `source` = `Walk-in`
   - `store` = `Suitor Guy - KANNUR`

7. **Suitor Guy - Perinthalmanna (33 leads)**
   - `leadType` = `general`
   - `source` = `Walk-in`
   - `store` = `Suitor Guy - Perinthalmanna`

8. **Suitor Guy - Thrissur (26 leads)**
   - `leadType` = `general`
   - `source` = `Walk-in`
   - `store` = `Suitor Guy - Thrissur`

9. **Suitor Guy - Chavakkad (24 leads)**
   - `leadType` = `general`
   - `source` = `Walk-in`
   - `store` = `Suitor Guy - Chavakkad`

10. **Zurocci - Perinthalmanna (23 leads)**
    - `leadType` = `general`
    - `source` = `Walk-in`
    - `store` = `Zurocci - Perinthalmanna`

11. **Suitor Guy - KALPETTA (20 leads)**
    - `leadType` = `general`
    - `source` = `Walk-in`
    - `store` = `Suitor Guy - KALPETTA`

12. **Suitor Guy - VATAKARA (19 leads)**
    - `leadType` = `general`
    - `source` = `Walk-in`
    - `store` = `Suitor Guy - VATAKARA`

13. **Suitor Guy - CALICUT (17 leads)**
    - `leadType` = `general`
    - `source` = `Walk-in`
    - `store` = `Suitor Guy - CALICUT`

14. **Zurocci - Z.Kottakkal (16 leads)**
    - `leadType` = `general`
    - `source` = `Walk-in`
    - `store` = `Zurocci - Z.Kottakkal`

15. **Suitor Guy - Z.Kottakkal (14 leads)**
    - `leadType` = `general`
    - `source` = `Walk-in`
    - `store` = `Suitor Guy - Z.Kottakkal`

16. **Suitor Guy - Manjeri (12 leads)**
    - `leadType` = `general`
    - `source` = `Walk-in`
    - `store` = `Suitor Guy - Manjeri`

17. **Suitor Guy - Perumbavoor (6 leads)**
    - `leadType` = `general`
    - `source` = `Walk-in`
    - `store` = `Suitor Guy - Perumbavoor`

18. **Suitor Guy - Palakkad (1 lead)**
    - `leadType` = `general`
    - `source` = `Walk-in`
    - `store` = `Suitor Guy - Palakkad`

---

## Quick Steps in Postman

1. Create a new **GET** request
2. URL: `http://localhost:8800/api/pages/leads`
3. Go to **Params** tab:
   - Add: `leadType` = `general`
   - Add: `source` = `Walk-in`
   - Add: `store` = `Suitor Guy - Edappal` (or any store from list)
4. Go to **Authorization** tab:
   - Type: **Bearer Token**
   - Token: Your login token
5. Click **Send**

---

## Full URL Examples

### Example 1: Suitor Guy - Edappal
```
GET http://localhost:8800/api/pages/leads?leadType=general&source=Walk-in&store=Suitor%20Guy%20-%20Edappal
```

### Example 2: Zurocci - Edappal
```
GET http://localhost:8800/api/pages/leads?leadType=general&source=Walk-in&store=Zurocci%20-%20Edappal
```

### Example 3: Suitor Guy - Trivandrum
```
GET http://localhost:8800/api/pages/leads?leadType=general&source=Walk-in&store=Suitor%20Guy%20-%20Trivandrum
```

---

## Tips

- **Store names are case-sensitive** - Use exact names from the list
- **Postman auto-encodes spaces** - Just paste the store name as-is
- **Empty array means 0 leads** for that store
- **Add pagination**: `&page=1&limit=100` to see more results per page
- **Source filter is required** - Use `source=Walk-in` to filter walk-in leads only

---

## Troubleshooting

### Empty Results
- Check if store name matches exactly (case-sensitive)
- Verify you're logged in as admin (or leads are assigned to you)
- Check if that store actually has walk-in leads
- Make sure `source=Walk-in` is included in params

### 403 Forbidden
- Make sure Authorization header is set
- Token might be expired - login again

### Wrong Store Name
- Run the script to get exact store names
- Check database for actual store names

---

## Difference from Loss of Sale

- **Loss of Sale**: `leadType=lossOfSale` (no source filter needed)
- **Walk-in**: `leadType=general` + `source=Walk-in` (both required)


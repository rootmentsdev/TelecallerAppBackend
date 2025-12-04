# How to Test Loss of Sale Endpoint in Postman

## Step 1: Login to Get Authentication Token

### Request Configuration
1. **Method**: `POST`
2. **URL**: `http://localhost:5000/api/auth/login`
   - (Replace `localhost:5000` with your server URL if different)

3. **Headers**:
   - `Content-Type`: `application/json`

4. **Body** (raw JSON):
   ```json
   {
     "employeeId": "your_employee_id",
     "password": "your_password"
   }
   ```

### Example Request
```
POST http://localhost:5000/api/auth/login
Content-Type: application/json

{
  "employeeId": "EMP001",
  "password": "password123"
}
```

### Expected Response
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user_id",
    "employeeId": "EMP001",
    "name": "User Name",
    "role": "telecaller",
    "store": "Z- Edapally"
  }
}
```

**Important**: Copy the `token` value from the response. You'll need it for the next step.

---

## Step 2: Get Loss of Sale Data for a Shop

### Request Configuration
1. **Method**: `GET`
2. **URL**: `http://localhost:5000/api/pages/leads`
   - (Replace `localhost:5000` with your server URL if different)

3. **Headers**:
   - `Authorization`: `Bearer YOUR_TOKEN_HERE`
     - Replace `YOUR_TOKEN_HERE` with the token from Step 1
   - `Content-Type`: `application/json` (optional)

4. **Query Parameters** (in Params tab):
   - `leadType`: `lossOfSale`
   - `store`: `Z- Edapally` (or your shop name)
   - `page`: `1` (optional)
   - `limit`: `50` (optional)

### Example Request
```
GET http://localhost:5000/api/pages/leads?leadType=lossOfSale&store=Z- Edapally
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Full URL Example
```
http://localhost:5000/api/pages/leads?leadType=lossOfSale&store=Z- Edapally&page=1&limit=50
```

### Expected Response
```json
{
  "leads": [
    {
      "id": "507f1f77bcf86cd799439011",
      "lead_name": "Customer Name",
      "phone_number": "9876543210",
      "store": "Z- Edapally",
      "lead_type": "lossOfSale",
      "call_status": "Not Called",
      "lead_status": "No Status",
      "visit_date": "2024-01-15T00:00:00.000Z",
      "function_date": "2024-02-20T00:00:00.000Z",
      "enquiry_date": "2024-01-10T00:00:00.000Z",
      "reason_collected_from_store": "Price too high",
      "attended_by": "Staff Name",
      "created_at": "2024-01-10T10:00:00.000Z",
      "assigned_to": null
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 25,
    "pages": 1
  }
}
```

---

## Step-by-Step Postman Instructions

### Step 1: Login Request

1. Open Postman
2. Click **New** → **HTTP Request**
3. Set method to **POST**
4. Enter URL: `http://localhost:5000/api/auth/login`
5. Go to **Headers** tab:
   - Add: `Content-Type` = `application/json`
6. Go to **Body** tab:
   - Select **raw**
   - Select **JSON** from dropdown
   - Enter:
     ```json
     {
       "employeeId": "your_employee_id",
       "password": "your_password"
     }
     ```
7. Click **Send**
8. Copy the `token` from the response

### Step 2: Get Loss of Sale Data

1. Click **New** → **HTTP Request** (or duplicate the previous request)
2. Set method to **GET**
3. Enter URL: `http://localhost:5000/api/pages/leads`
4. Go to **Params** tab (Query Parameters):
   - Add parameter: `leadType` = `lossOfSale`
   - Add parameter: `store` = `Z- Edapally` (or your shop name)
   - Add parameter: `page` = `1` (optional)
   - Add parameter: `limit` = `50` (optional)
5. Go to **Headers** tab:
   - Add: `Authorization` = `Bearer YOUR_TOKEN_HERE`
     - Replace `YOUR_TOKEN_HERE` with the token from Step 1
6. Click **Send**

---

## Common Store Names

Use these exact store names in the `store` parameter:

- `Z- Edapally`
- `SG-Edappally`
- `Trivandrum`
- `PMNA`
- `Z.Kottakkal`
- `Kottayam`
- `Perumbavoor`
- `Trissur`
- `Chavakkad`
- `CALICUT`
- `VATAKARA`
- `KALPETTA`
- `KANNUR`
- `MANJERY`
- `Palakkad`

---

## Troubleshooting

### Error: 403 Forbidden (Response: `1`)
- **Cause**: Missing Authorization header or invalid token
- **Solution**: 
  1. **Check Authorization Header**:
     - Go to **Headers** tab in Postman
     - Make sure you have: `Authorization` = `Bearer YOUR_TOKEN`
     - The word "Bearer" must be followed by a space, then your token
  2. **Or use Authorization Tab**:
     - Go to **Authorization** tab
     - Select **Type: Bearer Token**
     - Paste your token in the **Token** field
  3. **Verify Token**:
     - Make sure you copied the FULL token from login response
     - Token should be a long string starting with `eyJ...`
  4. **Try Login Again**:
     - Login endpoint: `POST /api/auth/login`
     - Get a fresh token
     - Use the new token in your request

### Error: 401 Unauthorized
- **Cause**: Missing or invalid token
- **Solution**: 
  1. Make sure you copied the full token from login response
  2. Token should start with `Bearer ` (with space after Bearer)
  3. Try logging in again to get a fresh token

### Error: 400 Bad Request
- **Cause**: Invalid query parameters
- **Solution**: 
  1. Check that `leadType=lossOfSale` is spelled correctly
  2. Check that `store` name matches exactly (case-sensitive)
  3. Verify the store name exists in your database

### Error: 404 Not Found
- **Cause**: Wrong URL or endpoint
- **Solution**: 
  1. Verify the server is running
  2. Check the base URL (should be `http://localhost:5000` or your server URL)
  3. Verify the endpoint path: `/api/pages/leads`

### Empty Results: `{"leads": [], "pagination": {...}}`
- **Cause**: No loss of sale data for that store
- **Solution**: 
  1. Check if the store name is correct
  2. Verify loss of sale data exists in database for that store
  3. Try a different store name
  4. Check if data was imported correctly

---

## Using Postman Environment Variables (Optional)

To make testing easier, you can set up environment variables:

1. Click **Environments** → **+** (Create new environment)
2. Add variables:
   - `base_url`: `http://localhost:5000`
   - `token`: (leave empty, will be set after login)
3. In your requests, use:
   - URL: `{{base_url}}/api/pages/leads`
   - Authorization: `Bearer {{token}}`

### Setting Token Automatically
After login, you can use Postman's **Tests** tab to automatically save the token:

```javascript
// In Login request, Tests tab:
if (pm.response.code === 200) {
    const jsonData = pm.response.json();
    pm.environment.set("token", jsonData.token);
    console.log("Token saved to environment");
}
```

---

## Quick Test Checklist

- [ ] Server is running
- [ ] Login request returns 200 with token
- [ ] Token is copied correctly (including `Bearer ` prefix)
- [ ] GET request has `leadType=lossOfSale` parameter
- [ ] GET request has `store=STORE_NAME` parameter
- [ ] Authorization header includes the token
- [ ] Response returns 200 with leads array

---

## Example Postman Collection JSON

You can import this into Postman:

```json
{
  "info": {
    "name": "Loss of Sale API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Login",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"employeeId\": \"your_employee_id\",\n  \"password\": \"your_password\"\n}"
        },
        "url": {
          "raw": "http://localhost:5000/api/auth/login",
          "protocol": "http",
          "host": ["localhost"],
          "port": "5000",
          "path": ["api", "auth", "login"]
        }
      }
    },
    {
      "name": "Get Loss of Sale by Shop",
      "request": {
        "method": "GET",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{token}}"
          }
        ],
        "url": {
          "raw": "http://localhost:5000/api/pages/leads?leadType=lossOfSale&store=Z- Edapally",
          "protocol": "http",
          "host": ["localhost"],
          "port": "5000",
          "path": ["api", "pages", "leads"],
          "query": [
            {
              "key": "leadType",
              "value": "lossOfSale"
            },
            {
              "key": "store",
              "value": "Z- Edapally"
            },
            {
              "key": "page",
              "value": "1"
            },
            {
              "key": "limit",
              "value": "50"
            }
          ]
        }
      }
    }
  ]
}
```

Save this as a `.json` file and import it into Postman via **Import** button.


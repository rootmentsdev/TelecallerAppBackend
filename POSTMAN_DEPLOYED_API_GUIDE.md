# Postman Guide: Testing Deployed API on Render

This guide shows you how to test your deployed backend API at `https://telecallerappbackend.onrender.com` using Postman.

---

## 🌐 Base URL

**Production API Base URL:**
```
https://telecallerappbackend.onrender.com
```

---

## ✅ Step 1: Health Check (No Authentication Required)

Test if your server is running and accessible.

### Request:
- **Method:** `GET`
- **URL:** `https://telecallerappbackend.onrender.com/health`
- **Headers:** None required

### Expected Response:
```json
{
  "status": "ok",
  "message": "Server is running"
}
```

### Postman Setup:
1. Create a new request
2. Set method to `GET`
3. Enter URL: `https://telecallerappbackend.onrender.com/health`
4. Click **Send**

---

## 🔐 Step 2: User Login (Get Authentication Token)

Login to get a JWT token that you'll use for protected endpoints.

### Request:
- **Method:** `POST`
- **URL:** `https://telecallerappbackend.onrender.com/api/auth/login`
- **Headers:**
  - `Content-Type: application/json`
- **Body (raw JSON):**
```json
{
  "employeeId": "Emp188",
  "password": "your-password"
}
```

### Expected Response:
```json
{
  "message": "Login successful",
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "employeeId": "Emp188",
    "name": "User Name",
    "store": "Store Name",
    "phone": "",
    "role": "admin"
  }
}
```

### Postman Setup:
1. Create a new request
2. Set method to `POST`
3. Enter URL: `https://telecallerappbackend.onrender.com/api/auth/login`
4. Go to **Headers** tab:
   - Add: `Content-Type` = `application/json`
5. Go to **Body** tab:
   - Select **raw**
   - Select **JSON** from dropdown
   - Paste the JSON body above (replace `employeeId` and `password` with your actual credentials)
6. Click **Send**
7. **IMPORTANT:** Copy the `token` from the response - you'll need it for the next steps!

---

## 📋 Step 3: Fetch Leads (Protected Endpoint)

Now use the token to fetch leads. This endpoint requires authentication.

### Request:
- **Method:** `GET`
- **URL:** `https://telecallerappbackend.onrender.com/api/pages/leads`
- **Headers:**
  - `Authorization: Bearer <your-token-here>`
- **Query Parameters (optional):**
  - `leadType`: `lossOfSale`, `bookingConfirmation`, `rentOutFeedback`, `general`, `justDial`
  - `store`: Store name (e.g., `Zurocci - Edappal`)
  - `source`: `Walk-in` (for walk-in leads)
  - `page`: `1` (pagination)
  - `limit`: `50` (number of results per page)

### Example URLs:

**Get Loss of Sale leads:**
```
https://telecallerappbackend.onrender.com/api/pages/leads?leadType=lossOfSale
```

**Get Loss of Sale leads for specific store:**
```
https://telecallerappbackend.onrender.com/api/pages/leads?leadType=lossOfSale&store=Zurocci%20-%20Edappal
```

**Get Loss of Sale leads by date range (January 2024):**
```
https://telecallerappbackend.onrender.com/api/pages/leads?leadType=lossOfSale&enquiryDateFrom=2024-01-01&enquiryDateTo=2024-01-31
```

**Get Loss of Sale leads by function date:**
```
https://telecallerappbackend.onrender.com/api/pages/leads?leadType=lossOfSale&functionDateFrom=2024-02-01&functionDateTo=2024-02-28
```

**Get Loss of Sale leads by visit date:**
```
https://telecallerappbackend.onrender.com/api/pages/leads?leadType=lossOfSale&visitDateFrom=2024-01-15&visitDateTo=2024-01-20
```

**Get Loss of Sale leads with store and date filter:**
```
https://telecallerappbackend.onrender.com/api/pages/leads?leadType=lossOfSale&store=Zurocci%20-%20Edappal&enquiryDateFrom=2024-01-01&enquiryDateTo=2024-01-31
```

**Get Walk-in leads:**
```
https://telecallerappbackend.onrender.com/api/pages/leads?leadType=general&source=Walk-in
```

**Get Booking Confirmation leads:**
```
https://telecallerappbackend.onrender.com/api/pages/leads?leadType=bookingConfirmation
```

**Get Rent-Out leads:**
```
https://telecallerappbackend.onrender.com/api/pages/leads?leadType=rentOutFeedback
```

### Expected Response:
```json
{
  "success": true,
  "leads": [
    {
      "_id": "...",
      "name": "Customer Name",
      "phone": "9876543210",
      "store": "Zurocci - Edappal",
      "leadType": "lossOfSale",
      "source": "Loss of Sale",
      "enquiryDate": "2024-01-15T00:00:00.000Z",
      "callStatus": "Not Called",
      "leadStatus": "No Status",
      ...
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalLeads": 250,
    "limit": 50
  }
}
```

### Postman Setup:
1. Create a new request
2. Set method to `GET`
3. Enter URL: `https://telecallerappbackend.onrender.com/api/pages/leads`
4. Go to **Authorization** tab:
   - Select **Type: Bearer Token**
   - Paste your token (from Step 2) into the **Token** field
5. Go to **Params** tab (for query parameters):
   - Add `leadType` = `lossOfSale` (or other lead type)
   - Add `store` = `Zurocci - Edappal` (optional, for specific store)
   - Add `enquiryDateFrom` = `2024-01-01` (optional, for date filtering)
   - Add `enquiryDateTo` = `2024-01-31` (optional, for date filtering)
   - Add `functionDateFrom` = `2024-02-01` (optional, filter by function date)
   - Add `functionDateTo` = `2024-02-28` (optional, filter by function date)
   - Add `visitDateFrom` = `2024-01-15` (optional, filter by visit date - Loss of Sale)
   - Add `visitDateTo` = `2024-01-20` (optional, filter by visit date - Loss of Sale)
   - Add `page` = `1` (optional)
   - Add `limit` = `50` (optional)
6. Click **Send**

**Note:** For date filtering, use ISO format: `YYYY-MM-DD` (e.g., `2024-01-31`). See `DATE_FILTERING_GUIDE.md` for detailed date filtering options.

---

## 🔄 Step 4: Update Lead (POST Request)

Update a lead's information (e.g., call status, remarks).

### Request:
- **Method:** `POST`
- **URL:** `https://telecallerappbackend.onrender.com/api/pages/loss-of-sale`
- **Headers:**
  - `Authorization: Bearer <your-token-here>`
  - `Content-Type: application/json`
- **Body (raw JSON):**
```json
{
  "leadId": "lead-id-from-database",
  "callStatus": "Called",
  "leadStatus": "Interested",
  "remarks": "Customer showed interest, will follow up next week",
  "followUpDate": "2024-02-01"
}
```

### Postman Setup:
1. Create a new request
2. Set method to `POST`
3. Enter URL: `https://telecallerappbackend.onrender.com/api/pages/loss-of-sale`
4. Go to **Authorization** tab:
   - Select **Type: Bearer Token**
   - Paste your token
5. Go to **Headers** tab:
   - Add: `Content-Type` = `application/json`
6. Go to **Body** tab:
   - Select **raw**
   - Select **JSON** from dropdown
   - Paste the JSON body (replace `leadId` with actual lead ID from Step 3)
7. Click **Send**

---

## 📝 Other Available Endpoints

### Get Specific Lead by ID:
- **Method:** `GET`
- **URL:** `https://telecallerappbackend.onrender.com/api/pages/leads/:leadId`
- **Headers:** `Authorization: Bearer <token>`

### Create New Lead:
- **Method:** `POST`
- **URL:** `https://telecallerappbackend.onrender.com/api/pages/add-lead`
- **Headers:** `Authorization: Bearer <token>`, `Content-Type: application/json`

### Update Booking Confirmation:
- **Method:** `POST`
- **URL:** `https://telecallerappbackend.onrender.com/api/pages/booking-confirmation`
- **Headers:** `Authorization: Bearer <token>`, `Content-Type: application/json`

### Update Rent-Out:
- **Method:** `POST`
- **URL:** `https://telecallerappbackend.onrender.com/api/pages/rent-out`
- **Headers:** `Authorization: Bearer <token>`, `Content-Type: application/json`

### Update Just Dial:
- **Method:** `POST`
- **URL:** `https://telecallerappbackend.onrender.com/api/pages/just-dial`
- **Headers:** `Authorization: Bearer <token>`, `Content-Type: application/json`

---

## ⚠️ Troubleshooting

### 1. "401 Unauthorized" Error
- **Cause:** Missing or invalid token
- **Solution:** 
  - Make sure you logged in first (Step 2)
  - Copy the token exactly from the login response
  - Check that token is set in Authorization header as `Bearer <token>`
  - Token expires after 7 days - login again to get a new token

### 2. "403 Forbidden" Error
- **Cause:** Insufficient permissions
- **Solution:**
  - Check your user role (admin/teamLead can access more data)
  - Telecallers can only see leads assigned to them
  - Contact admin to update your role if needed

### 3. "CORS Error" (in browser, not Postman)
- **Cause:** Frontend URL not whitelisted
- **Solution:** 
  - Set `FRONTEND_URL` environment variable in Render dashboard
  - Should match your frontend domain exactly (no trailing slash)

### 4. "500 Internal Server Error"
- **Cause:** Server-side error
- **Solution:**
  - Check Render logs for detailed error message
  - Verify MongoDB connection string is correct
  - Verify all environment variables are set in Render

### 5. Empty Results Array
- **Cause:** No data in database or filters too restrictive
- **Solution:**
  - Run sync scripts to populate data: `npm run sync:all`
  - Check if store name matches exactly (case-sensitive)
  - Verify leadType is correct (e.g., `lossOfSale` not `loss-of-sale`)

### 6. "Connection Refused" or Timeout
- **Cause:** Server not running or Render service down
- **Solution:**
  - Check Render dashboard - service should be "Live"
  - Free tier services sleep after inactivity - first request may take 30-60 seconds
  - Check Render logs for errors

---

## 🎯 Quick Test Checklist

Use this checklist to verify your deployed API:

- [ ] ✅ Health check returns `{"status": "ok"}`
- [ ] ✅ Login with valid credentials returns token
- [ ] ✅ Login with invalid credentials returns 401
- [ ] ✅ Fetch leads with token returns data (or empty array if no data)
- [ ] ✅ Fetch leads without token returns 401
- [ ] ✅ Update lead with token works
- [ ] ✅ Update lead without token returns 401

---

## 💡 Pro Tips

1. **Save Token as Environment Variable:**
   - In Postman, create an environment
   - Set variable `token` = your JWT token
   - Use `{{token}}` in Authorization header
   - This way you don't have to copy-paste token every time

2. **Create a Collection:**
   - Save all these requests in a Postman Collection
   - Share with your team
   - Add pre-request scripts to auto-login if token expires

3. **Use Postman Environments:**
   - Create environments for:
     - `Local`: `http://localhost:8800`
     - `Production`: `https://telecallerappbackend.onrender.com`
   - Switch between them easily

4. **Monitor Render Logs:**
   - Keep Render dashboard open while testing
   - Watch logs in real-time to see API requests
   - Helps debug issues quickly

---

## 📚 Additional Resources

- **Local Testing Guide:** See `POSTMAN_TESTING_LOSS_OF_SALE.md`
- **Store-Specific Guides:** 
  - `POSTMAN_LOSS_OF_SALE_BY_STORE.md`
  - `POSTMAN_WALKIN_BY_STORE.md`
- **Deployment Guide:** `DEPLOYMENT_GUIDE.md`

---

## ✅ You're All Set!

You can now test your deployed API on Render using Postman. Start with the health check, then login, and finally test the protected endpoints with your token.


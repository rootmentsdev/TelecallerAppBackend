# How to Set Environment Variables

This guide shows you how to set environment variables for both local development and deployment platforms.

---

## 🏠 Local Development (Using .env file)

### Step 1: Create .env file

In your project root directory (`/Users/abijithgkaimal/Documents/TelecallerAppBackend/`), create a file named `.env`:

```bash
# In terminal, navigate to project directory
cd /Users/abijithgkaimal/Documents/TelecallerAppBackend

# Create .env file
touch .env
```

### Step 2: Add environment variables

Open `.env` file in your editor and add:

```env
# Core Configuration
PORT=8800
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/telecaller?retryWrites=true&w=majority
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
FRONTEND_URL=http://localhost:3000

# External API - Employee Verification
VERIFY_EMPLOYEE_API_URL=https://rootments.in/api/verify_employee
VERIFY_EMPLOYEE_API_TOKEN=RootX-production-9d17d9485eb772e79df8564004d4a4d4

# External API - Booking
BOOKING_API_BASE_URL=https://rentalapi.rootments.live
BOOKING_API_KEY=your-booking-api-token

# External API - Return
RETURN_API_BASE_URL=https://rentalapi.rootments.live
RETURN_API_KEY=your-return-api-token

# External API - Store
STORE_API_KEY=your-store-api-token
```

### Step 3: Replace placeholder values

- Replace `username:password` in `MONGO_URI` with your actual MongoDB credentials
- Replace `your-super-secret-jwt-key-change-this-in-production` with a strong random string
- Replace `your-booking-api-token` with actual API tokens
- Update `FRONTEND_URL` to your frontend URL

### Step 4: Verify .env is ignored

Make sure `.env` is in `.gitignore` (already done ✅)

---

## ☁️ Deployment Platforms

### Option 1: Render

**Steps:**

1. **Go to your Render Dashboard**
   - Visit: https://dashboard.render.com
   - Select your service

2. **Navigate to Environment Tab**
   - Click on your service
   - Go to **Environment** tab (left sidebar)

3. **Add Environment Variables**
   - Click **"Add Environment Variable"** button
   - For each variable:
     - **Key:** `MONGO_URI`
     - **Value:** `mongodb+srv://username:password@cluster.mongodb.net/telecaller`
     - Click **Save**

4. **Add All Variables**
   Repeat for each variable:
   - `PORT`
   - `MONGO_URI`
   - `JWT_SECRET`
   - `FRONTEND_URL`
   - `VERIFY_EMPLOYEE_API_URL`
   - `VERIFY_EMPLOYEE_API_TOKEN`
   - `BOOKING_API_BASE_URL`
   - `BOOKING_API_KEY`
   - `RETURN_API_BASE_URL`
   - `RETURN_API_KEY`
   - `STORE_API_KEY`

5. **Redeploy**
   - After adding variables, Render will auto-redeploy
   - Or manually trigger: **Manual Deploy** → **Deploy latest commit**

**Visual Guide:**
```
Render Dashboard
  → Your Service
    → Environment (left sidebar)
      → Add Environment Variable
        → Key: MONGO_URI
        → Value: mongodb+srv://...
        → Save
```

-------

### Option 2: Railway

**Steps:**

1. **Go to Railway Dashboard**
   - Visit: https://railway.app
   - Select your project

2. **Open Your Service**
   - Click on your backend service

3. **Go to Variables Tab**
   - Click **Variables** tab (top menu)

4. **Add Environment Variables**
   - Click **"New Variable"** or **"Raw Editor"**
   - Add variables in format:
     ```
     MONGO_URI=mongodb+srv://...
     JWT_SECRET=your-secret
     FRONTEND_URL=https://...
     ```
   - Or add one by one using the form

5. **Save and Deploy**
   - Railway auto-deploys when variables change

**Visual Guide:**
```
Railway Dashboard
  → Your Project
    → Your Service
      → Variables (top tab)
        → New Variable / Raw Editor
          → Add variables
```

---

### Option 3: Heroku

**Steps:**

1. **Using Heroku CLI:**
   ```bash
   # Set individual variables
   heroku config:set MONGO_URI="mongodb+srv://username:password@cluster.mongodb.net/telecaller"
   heroku config:set JWT_SECRET="your-secret-key"
   heroku config:set FRONTEND_URL="https://your-frontend.com"
   
   # Set multiple at once
   heroku config:set MONGO_URI="..." JWT_SECRET="..." FRONTEND_URL="..."
   ```

2. **Using Heroku Dashboard:**
   - Go to: https://dashboard.heroku.com
   - Select your app
   - Go to **Settings** tab
   - Click **Reveal Config Vars**
   - Click **Edit** or **Add**
   - Add each variable:
     - **KEY:** `MONGO_URI`
     - **VALUE:** `mongodb+srv://...`
   - Click **Save**

**Visual Guide:**
```
Heroku Dashboard
  → Your App
    → Settings (top tab)
      → Config Vars
        → Reveal Config Vars
          → Edit / Add
            → KEY: MONGO_URI
            → VALUE: mongodb+srv://...
            → Save
```

---

### Option 4: Vercel

**Steps:**

1. **Go to Vercel Dashboard**
   - Visit: https://vercel.com/dashboard
   - Select your project

2. **Go to Settings**
   - Click **Settings** tab

3. **Environment Variables**
   - Click **Environment Variables** (left sidebar)
   - Click **Add New**
   - Add each variable:
     - **Key:** `MONGO_URI`
     - **Value:** `mongodb+srv://...`
     - **Environment:** Production, Preview, Development (select all)
   - Click **Save**

4. **Redeploy**
   - Go to **Deployments** tab
   - Click **Redeploy**

---

### Option 5: DigitalOcean App Platform

**Steps:**

1. **Go to DigitalOcean Dashboard**
   - Visit: https://cloud.digitalocean.com
   - Select your app

2. **Go to Settings**
   - Click **Settings** tab

3. **Environment Variables**
   - Scroll to **App-Level Environment Variables**
   - Click **Edit**
   - Add variables:
     - **Key:** `MONGO_URI`
     - **Value:** `mongodb+srv://...`
   - Click **Save**

---

## 🔐 Generating Strong JWT_SECRET

**Option 1: Using OpenSSL (Mac/Linux)**
```bash
openssl rand -base64 32
```

**Option 2: Using Node.js**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**Option 3: Online Generator**
- Visit: https://randomkeygen.com/
- Use "CodeIgniter Encryption Keys" (256-bit)

**Example output:**
```
Xk8pL2mN9qR5tW7yZ1aB3cD6eF8gH0jK2lM4nP6qR8sT0uV2wX4yZ6aB8cD0eF
```

---

## ✅ Verification

### Check if variables are set:

**Local (Terminal):**
```bash
# Check if .env file exists
ls -la .env

# View .env content (be careful - contains secrets!)
cat .env
```

**Render:**
- Go to Environment tab
- All variables should be listed (values are hidden)

**Railway:**
- Go to Variables tab
- All variables should be listed

**Heroku:**
```bash
# View all config vars
heroku config

# View specific var
heroku config:get MONGO_URI
```

---

## 🚨 Important Security Notes

1. **Never commit .env file**
   - ✅ Already in `.gitignore`
   - ✅ Use `.env.example` as template

2. **Use different values for production**
   - Different `JWT_SECRET` for production
   - Different API tokens if needed

3. **Rotate secrets regularly**
   - Change `JWT_SECRET` periodically
   - Update API tokens when needed

4. **Don't share .env file**
   - Keep it private
   - Share `.env.example` instead

---

## 📋 Quick Checklist

- [ ] Created `.env` file locally
- [ ] Added all required variables
- [ ] Replaced placeholder values
- [ ] Set variables in deployment platform
- [ ] Generated strong `JWT_SECRET`
- [ ] Verified `.env` is in `.gitignore`
- [ ] Tested server starts with new variables

---

## 🆘 Troubleshooting

### Variables not working?

1. **Check file name:** Must be exactly `.env` (not `.env.txt` or `env`)
2. **Check location:** Must be in project root (same folder as `server.js`)
3. **Check format:** No spaces around `=`, no quotes needed (usually)
4. **Restart server:** After changing `.env`, restart your server
5. **Check deployment platform:** Variables might need redeploy

### Common mistakes:

- ❌ `MONGO_URI = mongodb://...` (spaces around =)
- ❌ `MONGO_URI="mongodb://..."` (quotes might cause issues)
- ✅ `MONGO_URI=mongodb://...` (correct)

---

## 📝 Example .env File

See `.env.example` file in your project for a complete template.

---

## 🎯 Next Steps

After setting environment variables:

1. **Test locally:**
   ```bash
   npm run dev
   ```

2. **Deploy to platform:**
   - Push to GitHub
   - Platform auto-deploys

3. **Verify deployment:**
   - Test health endpoint
   - Test login endpoint
   - Check logs for errors

Good luck! 🚀


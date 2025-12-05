# Deployment Guide - Telecaller Backend

This guide will help you deploy the backend and connect it with your frontend.

---

## 📋 Pre-Deployment Checklist

- [ ] All environment variables configured
- [ ] MongoDB connection string ready
- [ ] External API credentials ready
- [ ] CORS configured for frontend URL
- [ ] Health check endpoint working
- [ ] Server tested locally

---

## 🔧 Required Environment Variables

Create a `.env` file (or set in your deployment platform) with these variables:

### Core Configuration
```env
# Server Port (auto-set by most platforms, but can override)
PORT=8800

# MongoDB Connection
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/telecaller?retryWrites=true&w=majority

# JWT Secret (generate a strong random string)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Frontend URL (for CORS)
FRONTEND_URL=https://your-frontend-domain.com
```

### External API Configuration
```env
# Employee Verification API
VERIFY_EMPLOYEE_API_URL=https://rootments.in/api/verify_employee
VERIFY_EMPLOYEE_API_TOKEN=RootX-production-9d17d9485eb772e79df8564004d4a4d4

# Booking API
BOOKING_API_BASE_URL=http://15.207.90.158:5000
BOOKING_API_KEY=your-booking-api-token
BOOKING_API_ENDPOINT=/api/GetBooking/GetBookingList

# Rent-Out API
RENTOUT_API_BASE_URL=http://15.207.90.158:5000
RENTOUT_API_KEY=your-rentout-api-token
RENTOUT_API_ENDPOINT=/api/RentOut/GetRentOutList

# Store API
STORE_API_KEY=your-store-api-token
```

### Optional Configuration
```env
# Date ranges for syncs (optional)
BOOKING_DATE_FROM=
BOOKING_DATE_TO=
BOOKING_MONTHS=
RENTOUT_DATE_FROM=
RENTOUT_DATE_TO=
RENTOUT_MONTHS=

# CSV File Paths (for local imports)
LOSSOFSALE_CSV_PATH=data/lossofsale.csv
WALKIN_CSV_PATH=data/walkin.csv
```

---

## 🚀 Deployment Platforms

### Option 1: Render (Recommended)

**Steps:**

1. **Create a new Web Service** on Render
2. **Connect your GitHub repository**
3. **Configure:**
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Environment:** `Node`
   - **Node Version:** `18.x` or `20.x`

4. **Set Environment Variables:**
   - Go to **Environment** tab
   - Add all variables from the list above
   - **Important:** Set `FRONTEND_URL` to your frontend URL

5. **Deploy:**
   - Render will automatically deploy on push
   - Your backend URL will be: `https://your-app-name.onrender.com`

**Render-specific:**
- Health check endpoint: `/health` (already configured)
- Auto-deploys on git push
- Free tier available

---

### Option 2: Railway

**Steps:**

1. **Create a new project** on Railway
2. **Deploy from GitHub**
3. **Set Environment Variables:**
   - Go to **Variables** tab
   - Add all required variables

4. **Configure:**
   - Railway auto-detects Node.js
   - Uses `npm start` by default

**Railway-specific:**
- Generates URL automatically
- Supports custom domains
- Free tier available

---

### Option 3: Heroku

**Steps:**

1. **Install Heroku CLI:**
   ```bash
   npm install -g heroku
   ```

2. **Login and create app:**
   ```bash
   heroku login
   heroku create your-app-name
   ```

3. **Set environment variables:**
   ```bash
   heroku config:set MONGO_URI=your-mongodb-uri
   heroku config:set JWT_SECRET=your-jwt-secret
   heroku config:set FRONTEND_URL=https://your-frontend.com
   # ... add all other variables
   ```

4. **Deploy:**
   ```bash
   git push heroku main
   ```

**Heroku-specific:**
- Requires `Procfile` (optional, auto-detects)
- Free tier discontinued, paid plans available

---

### Option 4: VPS/Cloud Server (AWS, DigitalOcean, etc.)

**Steps:**

1. **SSH into your server**
2. **Install Node.js:**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

3. **Clone repository:**
   ```bash
   git clone https://github.com/your-username/TelecallerAppBackend.git
   cd TelecallerAppBackend
   ```

4. **Install dependencies:**
   ```bash
   npm install
   ```

5. **Create `.env` file:**
   ```bash
   nano .env
   # Add all environment variables
   ```

6. **Use PM2 for process management:**
   ```bash
   npm install -g pm2
   pm2 start server.js --name telecaller-backend
   pm2 save
   pm2 startup
   ```

7. **Configure Nginx (reverse proxy):**
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;

       location / {
           proxy_pass http://localhost:8800;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

---

## 🔒 Security Checklist

- [ ] **JWT_SECRET** is strong and unique (use random generator)
- [ ] **MONGO_URI** uses strong password
- [ ] **CORS** is configured for specific frontend URL (not `*`)
- [ ] **Environment variables** are not committed to git
- [ ] **API tokens** are kept secret
- [ ] **HTTPS** is enabled (for production)

---

## 🌐 Frontend Connection

### Update Frontend API Base URL

In your frontend, set the API base URL:

**Development:**
```javascript
const API_BASE_URL = 'http://localhost:8800';
```

**Production:**
```javascript
const API_BASE_URL = 'https://your-backend-domain.com';
```

### CORS Configuration

The backend is already configured to accept requests from:
- `FRONTEND_URL` (from environment variable)
- `http://localhost:3000` (development)
- `http://localhost:5173` (Vite dev server)
- `http://localhost:8080` (alternative dev port)

**To add your frontend URL:**
1. Set `FRONTEND_URL` environment variable to your frontend URL
2. Restart the server

---

## 📡 API Endpoints for Frontend

### Authentication
```
POST /api/auth/login
POST /api/auth/register
GET  /api/auth/profile
```

### Leads
```
GET  /api/pages/leads?leadType=lossOfSale&store=STORE_NAME
GET  /api/pages/loss-of-sale/:id
POST /api/pages/loss-of-sale/:id
GET  /api/pages/rent-out/:id
POST /api/pages/rent-out/:id
GET  /api/pages/booking-confirmation/:id
POST /api/pages/booking-confirmation/:id
```

### Assignment (Admin/Team Lead only)
```
POST /api/assign/single
POST /api/assign/bulk
```

### CSV Import (Admin/Team Lead only)
```
POST /api/import/csv
```

---

## ✅ Testing Deployment

### 1. Health Check
```bash
curl https://your-backend-url.com/health
```
Expected: `{"status":"ok","message":"Server is running"}`

### 2. Test Login
```bash
curl -X POST https://your-backend-url.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"employeeId":"emp188","password":"151298"}'
```

### 3. Test API with Token
```bash
curl https://your-backend-url.com/api/pages/leads?leadType=lossOfSale \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 🔄 Post-Deployment Tasks

1. **Sync initial data:**
   ```bash
   npm run sync:all
   ```

2. **Import CSV files:**
   ```bash
   npm run import:all:lossofsale
   npm run import:all:walkin
   ```

3. **Verify data:**
   ```bash
   npm run verify:data
   ```

4. **Set up scheduled syncs** (optional):
   - Use cron jobs or platform schedulers
   - Run `npm run sync:all` daily/weekly

---

## 🐛 Troubleshooting

### MongoDB Connection Issues
- Check `MONGO_URI` is correct
- Verify MongoDB allows connections from your deployment IP
- Check MongoDB Atlas network access settings

### CORS Errors
- Verify `FRONTEND_URL` is set correctly
- Check frontend is using correct API base URL
- Ensure CORS headers are being sent

### API Not Responding
- Check server logs
- Verify environment variables are set
- Test health endpoint first

### External API Errors
- Verify API tokens are correct
- Check external API is accessible from deployment server
- Review API rate limits

---

## 📝 Environment Variables Template

Create a `.env.example` file (commit this, not `.env`):

```env
# Core
PORT=8800
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/db
JWT_SECRET=change-this-to-random-string
FRONTEND_URL=https://your-frontend.com

# External APIs
VERIFY_EMPLOYEE_API_URL=https://rootments.in/api/verify_employee
VERIFY_EMPLOYEE_API_TOKEN=your-token
BOOKING_API_BASE_URL=http://15.207.90.158:5000
BOOKING_API_KEY=your-token
RENTOUT_API_BASE_URL=http://15.207.90.158:5000
RENTOUT_API_KEY=your-token
STORE_API_KEY=your-token
```

---

## 🎯 Quick Start Commands

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Start production server
npm start

# Sync all data
npm run sync:all

# Verify data
npm run verify:data
```

---

## 📞 Support

If you encounter issues:
1. Check server logs
2. Verify environment variables
3. Test endpoints with Postman
4. Check MongoDB connection
5. Review CORS configuration

---

## 🔐 Security Best Practices

1. **Never commit `.env` file** - Add to `.gitignore`
2. **Use strong JWT_SECRET** - Generate with: `openssl rand -base64 32`
3. **Enable HTTPS** - Use SSL certificates
4. **Limit CORS origins** - Don't use `*` in production
5. **Rotate API tokens** - Regularly update external API tokens
6. **Monitor logs** - Set up logging and monitoring

---

## 📊 Monitoring

Consider setting up:
- **Error tracking:** Sentry, Rollbar
- **Logging:** Winston, Pino
- **Monitoring:** PM2 Plus, New Relic
- **Uptime monitoring:** UptimeRobot, Pingdom

---

## 🚀 Next Steps

1. Choose deployment platform
2. Set up environment variables
3. Deploy backend
4. Update frontend API URL
5. Test all endpoints
6. Set up scheduled syncs
7. Monitor and maintain

Good luck with your deployment! 🎉


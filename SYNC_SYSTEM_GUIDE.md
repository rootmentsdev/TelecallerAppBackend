# 🔄 Robust API Sync System Guide

## Overview

This system provides **automatic, incremental API syncing every 20 minutes** while keeping CSV imports strictly manual. The system is designed to:

- ✅ Sync ONLY external APIs automatically
- ✅ Add ONLY new or updated records (incremental)
- ✅ Avoid duplication completely
- ✅ Keep CSV imports strictly manual
- ✅ Preserve all existing workflows

## 🕐 Automatic Sync (Every 20 Minutes)

### What Gets Synced Automatically
- **Stores API** - External store list
- **Booking Confirmation API** - New booking records
- **Return API** - `https://rentalapi.rootments.live/api/Reports/GetReturnReport`

### What Stays Manual
- ❌ Walk-in CSV imports
- ❌ Loss of Sale CSV imports
- ❌ Any file uploads

### Deduplication Logic
Each API uses unique keys to prevent duplicates:

**Booking/Return Records:**
- Primary: `bookingNo + phone + leadType`
- Fallback: `phone + name + leadType + store`
- **Behavior:** Skip existing records (preserve user edits)

**CSV Records (Manual Only):**
- Key: `phone + name + store + leadType + date`
- **Behavior:** Update existing records (keep data fresh)

## 🧠 Sync Logic Deep Dive

### 1. First Run (Initial Sync)
When the system runs for the very first time (or if `SyncLog` is empty):
- **Condition:** No successful `SyncLog` entry found for the specific API (e.g., 'return').
- **Action:** 
  - If `API_SYNC_INCREMENTAL_DAYS` is set (default: 7), it fetches data from **X days ago** to **Today**.
  - If no configuration is present, it defaults to fetching the **last 12 months** of data to populate the database.
- **Goal:** Establish a baseline dataset without overwhelming the external API.

### 2. Incremental Sync (Routine Operation)
For all subsequent runs:
- **Condition:** A valid `lastSyncAt` timestamp exists in `SyncLog`.
- **Action:** The system fetches a **Rolling Window** of data (Default: **Last 7 Days**).
- **Logic:** `dateFrom = Today - 7 Days`, `dateTo = Today`.
- **Benefit:** Ensures that any recent updates (e.g., return date modifications) are captured, even if they happened days after creation.
- **Safety:** The robust deduplication logic (`bookingNo` / `phone+store`) ensures we only save what's new or changed.

### 3. Fallback Mechanism
If the API call fails or returns ambiguous data:
- **Action:** The system logs the error and retries in the next cycle (20 mins later).
- **Safety:** It does **NOT** advance the `lastSyncAt` timestamp, ensuring no data is skipped during the downtime.

## 📁 File Structure

```
sync/
├── apiOnly.js              # API-only sync (used by scheduler)
├── runAll.js               # Full sync including CSV (manual)
├── api/
├── sync_return.js      # Return API sync
├── sync_booking.js     # Booking API sync
└── sync_storelist.js   # Store API sync
└── csv/                    # CSV imports (manual only)

scheduler/
└── apiSyncScheduler.js     # 20-minute scheduler
```

## 🎛️ Configuration

### Environment Variables (.env)
```bash
# Scheduler Configuration
API_SYNC_ENABLED=true           # Enable/disable automatic sync
API_SYNC_TIME=*/20 * * * *      # Every 20 minutes (Default)
API_SYNC_TIMEZONE=Asia/Kolkata  # Timezone

# Sync Logic Config
API_SYNC_INCREMENTAL_DAYS=7     # Days to look back if no history exists

# Return API Configuration
RETURN_API_BASE_URL=https://rentalapi.rootments.live
RETURN_API_KEY=your-return-api-token
```

### Cron Schedule Examples
```bash
*/20 * * * *    # Every 20 minutes (Recommended)
*/5 * * * *     # Every 5 minutes (Aggressive)
0 */1 * * *     # Every hour
0 9-17 * * *    # Every hour from 9 AM to 5 PM
```

## 🚀 Usage Commands

### Automatic Sync (Runs Every 20 Minutes)
```bash
# Starts automatically when server starts
npm start
```

### Manual Sync Commands
```bash
# API-only sync (same as automatic)
npm run sync:api

# Full sync (API + CSV imports)
npm run sync:all

# Individual API syncs
npm run sync:return
npm run sync:booking
npm run sync:stores
```

### Verification Commands
```bash
# Verify sync system status
npm run verify:sync

# Verify database data
npm run verify:data
```

## 📊 Monitoring & Logs

### Automatic Sync Logs
```
🕐 Starting automatic API sync at: 2024-12-22T10:05:00.000Z
📦 Step 1/3: Syncing Stores...
📦 Step 2/3: Syncing Booking Confirmation...
📦 Step 3/3: Syncing Returns...
✅ Automatic API sync completed successfully
⏱️  Duration: 12.3 seconds
📅 Next sync: 2024-12-22T10:25:00.000Z
```

### Incremental Sync Results
```
📊 Locations processed: 21/21
💾 Total new records saved: 15
⏭️  Total skipped (already exists): 142
❌ Total errors: 0
```

## 🛡️ Safety Features

### Duplicate Prevention
- **API Records:** Skip duplicates (preserve user edits)
- **CSV Records:** Update duplicates (keep data fresh)
- **Report Check:** Skip leads already moved to reports

### Error Handling
- **Connection Issues:** Retry with exponential backoff
- **API Failures:** Log errors, continue with other APIs
- **Data Validation:** Skip invalid records, log warnings

### Incremental Sync
- **Booking/Return:** Uses `lastSyncAt` timestamp
- **Stores:** Checks for existing records
- **Performance:** Only processes new/changed data

## 🔧 Troubleshooting

### Common Issues

**1. Sync Not Running**
```bash
# Check if enabled
echo $API_SYNC_ENABLED

# Check logs
npm start
# Look for: "📅 Starting API sync scheduler..."
```

**2. Duplicates Found**
```bash
# Run verification
npm run verify:sync

# Clean duplicates if needed
npm run cleanup:duplicates
```

**3. API Connection Issues**
```bash
# Test individual APIs
npm run sync:return
npm run sync:booking

# Check API configuration
echo $RETURN_API_BASE_URL
```

### Manual Intervention

**Disable Automatic Sync:**
```bash
# Set in .env
API_SYNC_ENABLED=false
```

**Change Sync Frequency:**
```bash
# Set in .env (every 10 minutes)
API_SYNC_TIME=*/10 * * * *
```

**Force Full Sync:**
```bash
npm run sync:all
```

## 📈 Performance Optimization

### Current Optimizations
- **Reduced Delays:** 500ms between API calls (was 2000ms)
- **Incremental Sync:** Only fetch new/updated records
- **Connection Reuse:** Single MongoDB connection per sync
- **Parallel Processing:** Multiple location IDs processed efficiently

### Monitoring Performance
```bash
# Check sync duration in logs
# Target: < 30 seconds for full API sync
# Actual: ~12-15 seconds typical

# Monitor database performance
npm run verify:data
```

## 🎯 Success Criteria

### ✅ Verification Checklist
- [ ] External APIs auto-sync every 20 minutes
- [ ] Only new data is added (no duplicates)
- [ ] CSV imports remain manual
- [ ] `npm run sync:all` still works
- [ ] No rent-out APIs are used
- [ ] Logs clearly show sync progress
- [ ] User edits are preserved
- [ ] System handles API failures gracefully

### 📊 Expected Results
- **New Records:** Added automatically every 20 minutes
- **Duplicates:** 0 (prevented by deduplication logic)
- **Performance:** < 30 seconds per sync cycle
- **Reliability:** 99%+ success rate
- **Data Integrity:** 100% preserved

## 🚨 Important Notes

### DO NOT Modify
- ❌ CSV import logic (must remain manual)
- ❌ Existing API routes and responses
- ❌ Database schemas unnecessarily
- ❌ Manual upload workflows

### Safe to Modify
- ✅ Sync frequency (API_SYNC_TIME)
- ✅ API endpoints (environment variables)
- ✅ Logging levels
- ✅ Error handling improvements

---

**Last Updated:** February 09, 2026
**Version:** 1.1
**Status:** Production Ready 🚀
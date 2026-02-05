import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import connectDB from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import assignmentRoutes from './routes/assignmentRoutes.js';
import csvImportRoutes from './routes/csvImportRoutes.js';
import csvUploadRoutes from './routes/csvUploadRoutes.js';
import pageRoutes from './routes/pageRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import healthRoutes from "./routes/healthRoutes.js";


// 👉 IMPORTANT: use import instead of require (ESM)
import { swaggerUi, swaggerSpec } from './config/swaggerConfig.js';

// API Sync Scheduler (does not affect CSV imports)
import { startScheduler } from './scheduler/apiSyncScheduler.js';
import SyncLock from './models/SyncLock.js';

const app = express();  // ❗ Define app BEFORE using it

// Swagger UI route
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use(express.json());

// CORS configuration
app.use(cors({
  origin: true,          // allow all origins (safe for mobile apps)
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));



import adminAuthRoutes from "./routes/adminAuthRoutes.js";

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin/auth', adminAuthRoutes);
app.use('/api/assign', assignmentRoutes);
app.use('/api/import', csvImportRoutes); // Existing route: /api/import/leads (admin/teamLead only)
app.use('/api/import', csvUploadRoutes); // New route: /api/import/csv (admin/super_admin only)
app.use('/api/pages', pageRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/admin', adminRoutes);
app.use("/api", healthRoutes);

// Serve static upload UI files
app.use(express.static('upload-ui'));

// Route specific HTML files

// Root Entry Point
app.get('/', (req, res) => {
  res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Telecaller System</title>
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body class="bg-gray-100 min-h-screen flex items-center justify-center p-4">
        <div class="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <h1 class="text-3xl font-bold text-gray-800 mb-2">Telecaller System</h1>
          <p class="text-gray-500 mb-8">Select a portal to continue</p>
          
          <div class="space-y-4">
            <a href="/upload" class="block w-full py-4 px-6 bg-blue-50 text-blue-700 font-semibold rounded-lg hover:bg-blue-100 transition-colors border border-blue-200 flex items-center justify-center gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
              Upload Calls (Telecaller)
            </a>
            
            <a href="http://localhost:5173/admin/login" class="block w-full py-4 px-6 bg-gray-50 text-gray-700 font-semibold rounded-lg hover:bg-gray-100 transition-colors border border-gray-200 flex items-center justify-center gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" x2="20" y1="8" y2="14"/><line x1="23" x2="17" y1="11" y2="11"/></svg>
              Admin Analytics Panel
            </a>
          </div>

          <div class="mt-8 text-xs text-gray-400">
            &copy; 2026 Telecaller System
          </div>
        </div>
      </body>
      </html>
    `);
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'upload-ui', 'login.html'));
});

app.get('/upload', (req, res) => {
  res.sendFile(path.join(__dirname, 'upload-ui', 'index.html'));
});


const PORT = process.env.PORT || 8800;

// Maximum sync duration before lock is considered expired (15 minutes)
const MAX_SYNC_DURATION = 15 * 60 * 1000; // 15 minutes in milliseconds
const GLOBAL_LOCK_NAME = "GLOBAL_API_SYNC";

// Check and clear expired sync locks on server startup
const checkStartupLocks = async () => {
  try {
    console.log("🔍 Checking for expired sync locks on startup...");
    console.log(`🔍 [DIAG] checkStartupLocks: MAX_SYNC_DURATION=${MAX_SYNC_DURATION}ms (${MAX_SYNC_DURATION / 60000} minutes), PID=${process.pid}`);
    const lock = await SyncLock.findOne({ lockName: GLOBAL_LOCK_NAME });

    if (!lock) {
      console.log("✅ No sync lock found - system is clean");
      return;
    }

    const lockAge = Date.now() - lock.lockedAt.getTime();
    const lockAgeSeconds = Math.round(lockAge / 1000);
    const lockAgeMinutes = Math.round(lockAge / 60000);
    const isExpired = lockAge > MAX_SYNC_DURATION;

    console.log(`🔍 [DIAG] Startup lock check: lockedAt=${lock.lockedAt.toISOString()}, age=${lockAgeSeconds}s (${lockAgeMinutes}m), status=${lock.status}, isExpired=${isExpired}`);

    if (isExpired) {
      console.log(`⚠️  Found expired sync lock (age: ${lockAgeMinutes} minutes)`);
      console.log(`   Locked at: ${lock.lockedAt.toISOString()}`);
      console.log(`   Locked by: ${lock.lockedBy}`);
      console.log(`   Status: ${lock.status}`);
      console.log(`   🔓 Auto-clearing expired lock...`);

      const deleteResult = await SyncLock.deleteOne({ lockName: GLOBAL_LOCK_NAME });
      console.log(`🔍 [DIAG] Startup deleteOne result: deletedCount=${deleteResult.deletedCount}, acknowledged=${deleteResult.acknowledged}`);

      if (deleteResult.deletedCount === 0) {
        console.error(`❌ CRITICAL: Startup lock delete returned deletedCount=0!`);
        console.error(`   Lock document snapshot:`, JSON.stringify(lock.toObject(), null, 2));
      } else {
        console.log(`✅ Expired lock cleared (deletedCount=${deleteResult.deletedCount}) - syncs can proceed normally`);
      }
    } else {
      console.log(`ℹ️  Active sync lock found (age: ${lockAgeMinutes} minutes)`);
      console.log(`   This is normal if a sync is currently running`);
      console.log(`   Lock will auto-expire after ${MAX_SYNC_DURATION / 60000} minutes if sync fails`);
    }
    console.log();
  } catch (error) {
    console.error("⚠️  Error checking startup locks:", error.message);
    console.error("   Stack:", error.stack);
    // Don't fail startup if lock check fails
  }
};

(async () => {
  try {
    await connectDB();                // ✅ WAIT for DB
    console.log("✅ Database connected");
    console.log();

    // Check and clear expired locks on startup
    await checkStartupLocks();

    app.listen(PORT, () => {
      console.log(`🚀 Backend running on port ${PORT}`);
      startScheduler();               // ✅ safe to start now
    });

  } catch (error) {
    console.error("❌ DB connection failed", error);
    process.exit(1);
  }
})();


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



// Routes
app.use('/api/auth', authRoutes);
app.use('/api/assign', assignmentRoutes);
app.use('/api/import', csvImportRoutes); // Existing route: /api/import/leads (admin/teamLead only)
app.use('/api/import', csvUploadRoutes); // New route: /api/import/csv (admin/super_admin only)
app.use('/api/pages', pageRoutes);
app.use('/api/reports', reportRoutes);
app.use("/api", healthRoutes);

// Serve static upload UI files
app.use(express.static('upload-ui'));

// Route specific HTML files
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
    const lock = await SyncLock.findOne({ lockName: GLOBAL_LOCK_NAME });
    
    if (!lock) {
      console.log("✅ No sync lock found - system is clean");
      return;
    }

    const lockAge = Date.now() - lock.lockedAt.getTime();
    const lockAgeMinutes = Math.round(lockAge / 60000);
    const isExpired = lockAge > MAX_SYNC_DURATION;

    if (isExpired) {
      console.log(`⚠️  Found expired sync lock (age: ${lockAgeMinutes} minutes)`);
      console.log(`   Locked at: ${lock.lockedAt.toISOString()}`);
      console.log(`   Locked by: ${lock.lockedBy}`);
      console.log(`   Status: ${lock.status}`);
      console.log(`   🔓 Auto-clearing expired lock...`);
      
      await SyncLock.deleteOne({ lockName: GLOBAL_LOCK_NAME });
      console.log(`✅ Expired lock cleared - syncs can proceed normally`);
    } else {
      console.log(`ℹ️  Active sync lock found (age: ${lockAgeMinutes} minutes)`);
      console.log(`   This is normal if a sync is currently running`);
      console.log(`   Lock will auto-expire after ${MAX_SYNC_DURATION / 60000} minutes if sync fails`);
    }
    console.log();
  } catch (error) {
    console.error("⚠️  Error checking startup locks:", error.message);
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


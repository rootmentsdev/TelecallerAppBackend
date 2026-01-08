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

(async () => {
  try {
    await connectDB();                // ✅ WAIT for DB
    console.log("✅ Database connected");

    app.listen(PORT, () => {
      console.log(`🚀 Backend running on port ${PORT}`);
      startScheduler();               // ✅ safe to start now
    });

  } catch (error) {
    console.error("❌ DB connection failed", error);
    process.exit(1);
  }
})();


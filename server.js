import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();

import connectDB from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import assignmentRoutes from './routes/assignmentRoutes.js';
import csvImportRoutes from './routes/csvImportRoutes.js';
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
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:8080',
].filter(Boolean);

app.use(cors({
  origin: allowedOrigins.length > 0 ? allowedOrigins : "*",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));


// Routes
app.use('/api/auth', authRoutes);
app.use('/api/assign', assignmentRoutes);
app.use('/api/import', csvImportRoutes);
app.use('/api/pages', pageRoutes);
app.use('/api/reports', reportRoutes);
app.use("/api", healthRoutes);


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


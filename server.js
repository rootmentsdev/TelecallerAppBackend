import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();

import connectDB from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import leadRoutes from './routes/leadRoutes.js';
import followUpRoutes from './routes/followUpRoutes.js';
import callLogRoutes from './routes/callLogRoutes.js';
import assignmentRoutes from './routes/assignmentRoutes.js';
import csvImportRoutes from './routes/csvImportRoutes.js';

const app = express();
app.use(express.json());

// CORS configuration - allow frontend from Render or localhost
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

connectDB();

app.use('/api/auth', authRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/followups', followUpRoutes);
app.use('/api/calls', callLogRoutes);
app.use('/api/assign', assignmentRoutes);
app.use('/api/import', csvImportRoutes);

// Health check endpoint for Render
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

const PORT = process.env.PORT || 8800;
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));

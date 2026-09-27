// Express Server for AeroSense-Delhi Backend
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

import apiRoutes from './routes/api.js';
import adminRoutes from './routes/admin.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/v1', apiRoutes);
app.use('/api/v1/admin', adminRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: "UP",
    system: "AeroSense-Delhi Coupled Weather-Chemistry Forecasting System",
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 AeroSense-Delhi Backend Running on Port ${PORT}`);
  console.log(`🌐 REST API: http://localhost:${PORT}/api/v1/forecast`);
  console.log(`⚙️ Admin Adapter Panel: http://localhost:${PORT}/api/v1/admin/data-sources`);
  console.log(`=======================================================`);
});

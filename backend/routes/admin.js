// Admin Data Source Management & Adapter Toggle Router
import express from 'express';
import { config } from '../config.js';

const router = express.Router();

// Get Current Data Sources Status & Providers
router.get('/data-sources', (req, res) => {
  res.json({
    systemMode: "Adapter-Pattern Scoped",
    version: config.version,
    dataSources: config.dataSources
  });
});

// Toggle Data Source Mode (mock <-> live)
router.post('/data-sources/toggle', (req, res) => {
  const { sourceType, provider } = req.body;
  if (!sourceType || !config.dataSources[sourceType]) {
    return res.status(400).json({ error: "Invalid source type specified." });
  }

  const targetProvider = provider || (config.dataSources[sourceType].provider === "mock" ? "live" : "mock");
  config.dataSources[sourceType].provider = targetProvider;
  config.dataSources[sourceType].lastFetch = new Date().toISOString();
  config.dataSources[sourceType].status = targetProvider === "mock" ? "HEALTHY (MOCK)" : "HEALTHY (LIVE-READY)";

  res.json({
    status: "SUCCESS",
    message: `Data source ${sourceType} updated to ${targetProvider} mode. Zero downstream code re-architecture required.`,
    updatedSource: config.dataSources[sourceType],
    allSources: config.dataSources
  });
});

export default router;

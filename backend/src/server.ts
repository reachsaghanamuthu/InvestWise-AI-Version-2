import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';

import { migrate } from './config/db.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { copilotAvailable } from './services/copilotService.js';
import { financialData } from './services/financialDataService.js';

import authRoutes from './routes/auth.js';
import stockRoutes from './routes/stocks.js';
import copilotRoutes from './routes/copilot.js';
import portfolioRoutes from './routes/portfolio.js';
import autopsyRoutes from './routes/autopsy.js';

const app = express();
const PORT = Number(process.env.PORT || 4000);

migrate();

app.use(helmet());
app.use(compression());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN?.split(',').map((s) => s.trim()) ?? true,
    credentials: true,
  }),
);
app.use(express.json({ limit: '1mb' }));

// One-line request log. Enough to debug a demo, small enough to read live.
app.use((req, _res, next) => {
  if (process.env.NODE_ENV !== 'test') {
    console.log(`${new Date().toISOString()} ${req.method} ${req.originalUrl}`);
  }
  next();
});

/* The model calls are the expensive ones, so they get their own tighter
   bucket rather than sharing the general limit. */
app.use('/api', rateLimit({ windowMs: 60_000, limit: 240, standardHeaders: true, legacyHeaders: false }));
app.use('/api/copilot', rateLimit({ windowMs: 60_000, limit: 20, standardHeaders: true, legacyHeaders: false }));
app.use('/api/autopsy/narrative', rateLimit({ windowMs: 60_000, limit: 8, standardHeaders: true, legacyHeaders: false }));

/** The frontend calls this at boot to label its data-source badge honestly. */
app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    live: financialData.liveCapable,
    copilot: copilotAvailable(),
    uptime: Math.round(process.uptime()),
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/stocks', stockRoutes);
app.use('/api/copilot', copilotRoutes);
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/autopsy', autopsyRoutes);

app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`InvestWise API listening on http://localhost:${PORT}`);
  console.log(`  market data : ${financialData.liveCapable ? 'live (Finnhub/Alpha Vantage)' : 'offline dataset — no API key set'}`);
  console.log(`  copilot     : ${copilotAvailable() ? `Claude (${process.env.CLAUDE_MODEL || 'claude-opus-5'})` : 'disabled — no CLAUDE_API_KEY'}`);
});

export default app;

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config';
import apiRoutes from './routes/api';
import { errorHandler } from './middleware/errorHandler';

const app = express();

// Trust reverse proxy (required on Render / Vercel / Nginx for express-rate-limit)
app.set('trust proxy', 1);

// Security headers
app.use(helmet());

// CORS configuration
const extraOrigins = config.frontendUrl
  .split(',')
  .map((url) => url.trim().replace(/\/+$/, ''))
  .filter(Boolean);

const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://wecove.in',
  'https://www.wecove.in',
  ...extraOrigins,
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or same-origin)
      if (!origin) return callback(null, true);
      const normalizedOrigin = origin.replace(/\/+$/, '');
      if (allowedOrigins.includes(normalizedOrigin) || process.env.NODE_ENV !== 'production') {
        callback(null, true);
      } else {
        callback(new Error('Blocked by CORS policy'));
      }
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

// Request body size limit
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// Logging
app.use(morgan(config.nodeEnv === 'production' ? 'combined' : 'dev'));

// API Routes
app.use('/api/v1', apiRoutes);

// Root fallback / basic ping
app.get('/', (req, res) => {
  res.json({
    name: 'WeCove.in API',
    status: 'online',
    endpoints: {
      health: '/api/v1/health',
      inquiries: 'POST /api/v1/inquiries',
    },
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Endpoint ${req.method} ${req.originalUrl} not found`,
  });
});

// Centralized error handler
app.use(errorHandler);

export default app;

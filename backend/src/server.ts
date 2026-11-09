import app from './app';
import { config } from './config';

const server = app.listen(config.port, () => {
  console.log('==================================================');
  console.log(`🚀 WeCove.in Backend API running on port ${config.port}`);
  console.log(`Environment: ${config.nodeEnv}`);
  console.log(`Health Check: http://localhost:${config.port}/api/v1/health`);
  console.log(`Inquiries Endpoint: http://localhost:${config.port}/api/v1/inquiries`);
  console.log('==================================================');
});

process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});

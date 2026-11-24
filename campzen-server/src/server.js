require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');
const mongoose = require('mongoose');
const { startCronJobs } = require('./services/cron.service');
const printerService = require('./services/printer.service');

startCronJobs();

const PORT = process.env.PORT || 5000;

// Connect to Database first, then start the server
connectDB().then(() => {
    // Start automated physical printer background listener
    printerService.startAutoPrintWatcher(3000);

    const server = app.listen(PORT, '0.0.0.0', () => {
        console.log(`[Server] CampZen backend started in ${process.env.NODE_ENV} mode on port ${PORT} (0.0.0.0)`);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (err, promise) => {
        console.error(`[Error] Unhandled Rejection: ${err.message}`);
        server.close(() => process.exit(1));
    });

    // Graceful shutdown on termination signals (e.g., Ctrl+C)
    process.on('SIGINT', async () => {
        console.log('[Server] Gracefully shutting down...');
        await mongoose.connection.close();
        console.log('[Database] MongoDB connection closed.');
        process.exit(0);
    });
});
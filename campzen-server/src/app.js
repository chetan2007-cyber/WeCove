const express = require('express');
const routes = require('./routes');
const errorHandler = require('./middleware/error.middleware');

const app = express();

// Disable framework fingerprinting
app.disable('x-powered-by');

// Global Security & CORS Middleware
app.use((req, res, next) => {
    // Security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Content-Security-Policy', "default-src 'self'");
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

    // CORS headers
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-kami-webhook-secret');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// Enforce explicit payload body size limit to prevent memory exhaustion DoS
app.use(express.json({ limit: '2mb' }));

// Mount the main API router
app.use('/api', routes);
app.use(errorHandler);

// 404 Handler for undefined routes
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});

module.exports = app;
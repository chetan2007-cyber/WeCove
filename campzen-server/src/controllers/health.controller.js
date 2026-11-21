const mongoose = require('mongoose');

const getHealthStatus = (req, res) => {
    // Mongoose readyState returns an integer: 0: disconnected, 1: connected, 2: connecting, 3: disconnecting
    const dbState = mongoose.connection.readyState;

    const dbStatusMap = {
        0: 'disconnected',
        1: 'connected',
        2: 'connecting',
        3: 'disconnecting',
    };

    res.status(200).json({
        success: true,
        api: 'running',
        database: dbStatusMap[dbState] || 'unknown',
        environment: process.env.NODE_ENV,
        timestamp: new Date().toISOString()
    });
};

module.exports = {
    getHealthStatus
};
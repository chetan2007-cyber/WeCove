const errorHandler = (err, req, res, next) => {
    let error = { ...err };
    error.message = err.message;

    // Log to console for the developer
    console.error(`[Error] ${err.stack}`);

    // Payload too large error from body-parser
    if (err.type === 'entity.too.large') {
        error = { message: 'Payload Too Large: request entity exceeds permitted limit', statusCode: 413 };
    }

    // Mongoose bad ObjectId
    if (err.name === 'CastError') {
        const message = 'Resource not found with specified identifier';
        error = { message, statusCode: 404 };
    }

    // Mongoose duplicate key (e.g., trying to use an already registered email)
    if (err.code === 11000) {
        const message = `Duplicate field value entered`;
        error = { message, statusCode: 400 };
    }

    // Mongoose validation error (e.g., missing required fields)
    if (err.name === 'ValidationError') {
        const message = Object.values(err.errors).map(val => val.message).join(', ');
        error = { message, statusCode: 400 };
    }

    res.status(error.statusCode || error.status || err.status || 500).json({
        success: false,
        message: error.message || 'Server Error'
    });
};

module.exports = errorHandler;
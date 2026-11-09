import { Request, Response, NextFunction } from 'express';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void {
  const statusCode = err.status || err.statusCode || 500;
  const isProduction = process.env.NODE_ENV === 'production';

  console.error(`[Error] ${req.method} ${req.url}:`, err.message || err);

  res.status(statusCode).json({
    success: false,
    message: isProduction && statusCode === 500
      ? 'An internal server error occurred. Please try again later or reach out to wecove.in@gmail.com directly.'
      : err.message || 'Internal Server Error',
    ...(isProduction ? {} : { stack: err.stack }),
  });
}

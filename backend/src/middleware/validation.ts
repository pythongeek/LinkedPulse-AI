import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { logger } from '../utils/logger';

/**
 * Middleware factory to validate request body against a Zod schema
 */
export const validateBody = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = schema.parse(req.body);
      req.body = validated;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors = error.issues.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));

        logger.warn('Validation error:', { errors: formattedErrors });

        return res.status(400).json({
          error: {
            message: 'Validation failed',
            code: 'VALIDATION_ERROR',
            details: formattedErrors,
          },
        });
      }

      logger.error('Unexpected validation error:', error);
      return res.status(500).json({
        error: {
          message: 'Internal server error',
          code: 'INTERNAL_ERROR',
        },
      });
    }
  };
};

/**
 * Middleware factory to validate request query against a Zod schema
 */
export const validateQuery = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = schema.parse(req.query);
      req.query = validated;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors = error.issues.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));

        return res.status(400).json({
          error: {
            message: 'Query validation failed',
            code: 'VALIDATION_ERROR',
            details: formattedErrors,
          },
        });
      }

      return res.status(500).json({
        error: {
          message: 'Internal server error',
          code: 'INTERNAL_ERROR',
        },
      });
    }
  };
};

/**
 * Middleware factory to validate request params against a Zod schema
 */
export const validateParams = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = schema.parse(req.params);
      req.params = validated;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors = error.issues.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));

        return res.status(400).json({
          error: {
            message: 'Params validation failed',
            code: 'VALIDATION_ERROR',
            details: formattedErrors,
          },
        });
      }

      return res.status(500).json({
        error: {
          message: 'Internal server error',
          code: 'INTERNAL_ERROR',
        },
      });
    }
  };
};

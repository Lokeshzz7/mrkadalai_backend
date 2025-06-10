import { Prisma } from '@prisma/client';

const errorMiddleware = (err, req, res, next) => {
    try {
        let error = {
            message: err.message || 'Internal Server Error',
            statusCode: err.statusCode || 500,
            code: err.code || 'INTERNAL_ERROR'
        };

        // Log the full error for debugging (you might want to use a proper logger)
        console.error('Error occurred:', {
            message: err.message,
            statusCode: err.statusCode,
            code: err.code,
            meta: err.meta,
            stack: err.stack,
            path: req.path,
            method: req.method
        });

        // Handle custom errors with statusCode (from your controllers)
        if (err.statusCode) {
            error.statusCode = err.statusCode;
            error.message = err.message;

            // Set appropriate error codes based on status
            switch (err.statusCode) {
                case 400:
                    error.code = 'BAD_REQUEST';
                    break;
                case 401:
                    error.code = 'UNAUTHORIZED';
                    break;
                case 403:
                    error.code = 'FORBIDDEN';
                    break;
                case 404:
                    error.code = 'NOT_FOUND';
                    break;
                case 409:
                    error.code = 'CONFLICT';
                    break;
                case 422:
                    error.code = 'VALIDATION_ERROR';
                    break;
                case 429:
                    error.code = 'RATE_LIMIT_EXCEEDED';
                    break;
                case 500:
                    error.code = 'INTERNAL_SERVER_ERROR';
                    break;
                case 503:
                    error.code = 'SERVICE_UNAVAILABLE';
                    break;
                default:
                    error.code = 'UNKNOWN_ERROR';
            }
        }

        // Prisma Client Known Request Errors (P2xxx codes)
        if (err instanceof Prisma.PrismaClientKnownRequestError) {
            switch (err.code) {
                case 'P2000':
                    error.message = 'The provided value is too long for the column';
                    error.statusCode = 400;
                    error.code = 'VALUE_TOO_LONG';
                    break;

                case 'P2001':
                    error.message = 'Record not found';
                    error.statusCode = 404;
                    error.code = 'RECORD_NOT_FOUND';
                    break;

                case 'P2002':
                    const target = err.meta?.target;
                    error.message = target
                        ? `Duplicate value for ${Array.isArray(target) ? target.join(', ') : target}`
                        : 'Duplicate value detected';
                    error.statusCode = 409;
                    error.code = 'DUPLICATE_ENTRY';
                    break;

                case 'P2003':
                    error.message = 'Foreign key constraint violation';
                    error.statusCode = 400;
                    error.code = 'FOREIGN_KEY_CONSTRAINT';
                    break;

                case 'P2004':
                    error.message = 'Database constraint violation';
                    error.statusCode = 400;
                    error.code = 'CONSTRAINT_VIOLATION';
                    break;

                case 'P2025':
                    error.message = 'Record to update/delete not found';
                    error.statusCode = 404;
                    error.code = 'RECORD_NOT_FOUND';
                    break;

                case 'P2014':
                    error.message = 'Invalid relation - required field is missing';
                    error.statusCode = 400;
                    error.code = 'INVALID_RELATION';
                    break;

                case 'P2015':
                    error.message = 'Related record not found';
                    error.statusCode = 404;
                    error.code = 'RELATED_RECORD_NOT_FOUND';
                    break;

                case 'P2016':
                    error.message = 'Query interpretation error';
                    error.statusCode = 400;
                    error.code = 'QUERY_INTERPRETATION_ERROR';
                    break;

                case 'P2017':
                    error.message = 'Records for relation are not connected';
                    error.statusCode = 400;
                    error.code = 'RECORDS_NOT_CONNECTED';
                    break;

                case 'P2018':
                    error.message = 'Required connected records not found';
                    error.statusCode = 404;
                    error.code = 'CONNECTED_RECORDS_NOT_FOUND';
                    break;

                case 'P2019':
                    error.message = 'Input error';
                    error.statusCode = 400;
                    error.code = 'INPUT_ERROR';
                    break;

                case 'P2020':
                    error.message = 'Value out of range';
                    error.statusCode = 400;
                    error.code = 'VALUE_OUT_OF_RANGE';
                    break;

                case 'P2021':
                    error.message = 'Table does not exist';
                    error.statusCode = 500;
                    error.code = 'TABLE_NOT_EXISTS';
                    break;

                case 'P2022':
                    error.message = 'Column does not exist';
                    error.statusCode = 500;
                    error.code = 'COLUMN_NOT_EXISTS';
                    break;

                case 'P2023':
                    error.message = 'Inconsistent column data';
                    error.statusCode = 500;
                    error.code = 'INCONSISTENT_COLUMN_DATA';
                    break;

                case 'P2024':
                    error.message = 'Connection timeout';
                    error.statusCode = 503;
                    error.code = 'CONNECTION_TIMEOUT';
                    break;

                case 'P2027':
                    error.message = 'Multiple database errors occurred';
                    error.statusCode = 500;
                    error.code = 'MULTIPLE_ERRORS';
                    break;

                default:
                    error.message = 'Database operation failed';
                    error.statusCode = 500;
                    error.code = 'DATABASE_ERROR';
            }
        }

        // Prisma Client Validation Errors
        else if (err instanceof Prisma.PrismaClientValidationError) {
            error.message = 'Invalid data provided';
            error.statusCode = 400;
            error.code = 'VALIDATION_ERROR';
        }

        // Prisma Client Initialization Errors
        else if (err instanceof Prisma.PrismaClientInitializationError) {
            error.message = 'Database connection failed';
            error.statusCode = 503;
            error.code = 'DATABASE_CONNECTION_ERROR';
        }

        // Prisma Client Rust Panic Errors
        else if (err instanceof Prisma.PrismaClientRustPanicError) {
            error.message = 'Database engine error';
            error.statusCode = 500;
            error.code = 'DATABASE_ENGINE_ERROR';
        }

        // JWT Errors
        else if (err.name === 'JsonWebTokenError') {
            error.message = 'Invalid token';
            error.statusCode = 401;
            error.code = 'INVALID_TOKEN';
        }
        else if (err.name === 'TokenExpiredError') {
            error.message = 'Token expired';
            error.statusCode = 401;
            error.code = 'TOKEN_EXPIRED';
        }

        // Validation Errors (from express-validator or joi)
        else if (err.name === 'ValidationError' || err.errors) {
            error.message = Array.isArray(err.errors)
                ? err.errors.map(e => e.message || e).join(', ')
                : 'Validation failed';
            error.statusCode = 400;
            error.code = 'VALIDATION_ERROR';
        }

        // Multer Errors (file upload)
        else if (err.code === 'LIMIT_FILE_SIZE') {
            error.message = 'File size too large';
            error.statusCode = 413;
            error.code = 'FILE_TOO_LARGE';
        }
        else if (err.code === 'LIMIT_FILE_COUNT') {
            error.message = 'Too many files uploaded';
            error.statusCode = 413;
            error.code = 'TOO_MANY_FILES';
        }
        else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            error.message = 'Unexpected file field';
            error.statusCode = 400;
            error.code = 'UNEXPECTED_FILE';
        }

        // Syntax Errors
        else if (err instanceof SyntaxError) {
            error.message = 'Invalid JSON format';
            error.statusCode = 400;
            error.code = 'INVALID_JSON';
        }

        // Permission/Authorization Errors
        else if (err.message?.toLowerCase().includes('permission') ||
            err.message?.toLowerCase().includes('unauthorized')) {
            error.message = 'Insufficient permissions';
            error.statusCode = 403;
            error.code = 'INSUFFICIENT_PERMISSIONS';
        }

        // Rate Limiting Errors
        else if (err.message?.toLowerCase().includes('rate limit')) {
            error.message = 'Too many requests';
            error.statusCode = 429;
            error.code = 'RATE_LIMIT_EXCEEDED';
        }

        // Send error response
        const response = {
            success: false,
            error: {
                message: error.message,
                code: error.code,
                ...(process.env.NODE_ENV === 'development' && {
                    stack: err.stack,
                    details: err.meta
                })
            }
        };

        res.status(error.statusCode).json(response);

    } catch (catchError) {
        // Fallback error handling
        console.error('Error in error middleware:', catchError);
        res.status(500).json({
            success: false,
            error: {
                message: 'Internal Server Error',
                code: 'INTERNAL_ERROR'
            }
        });
    }
};

export default errorMiddleware;
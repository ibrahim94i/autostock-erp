"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var AllExceptionsFilter_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AllExceptionsFilter = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const event_core_service_1 = require("../../events/event-core.service");
const TRANSIENT_PRISMA_CODES = new Set([
    'P1001',
    'P1002',
    'P1008',
    'P1017',
    'P2034',
]);
let AllExceptionsFilter = AllExceptionsFilter_1 = class AllExceptionsFilter {
    logger = new common_1.Logger(AllExceptionsFilter_1.name);
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const request = ctx.getRequest();
        const timestamp = new Date().toISOString();
        const path = request.url;
        if (exception instanceof common_1.HttpException) {
            const status = exception.getStatus();
            const exceptionResponse = exception.getResponse();
            const message = this.extractMessage(exceptionResponse);
            const error = this.extractErrorName(exceptionResponse, status);
            this.logException('warn', exception, status, path);
            response.status(status).json({
                statusCode: status,
                error,
                message,
                timestamp,
                path,
            });
            return;
        }
        if (exception instanceof event_core_service_1.ValidationError) {
            this.logException('warn', exception, common_1.HttpStatus.UNPROCESSABLE_ENTITY, path);
            response.status(common_1.HttpStatus.UNPROCESSABLE_ENTITY).json({
                statusCode: common_1.HttpStatus.UNPROCESSABLE_ENTITY,
                error: 'Unprocessable Entity',
                message: exception.reason,
                timestamp,
                path,
            });
            return;
        }
        if (this.isTransientDatabaseError(exception)) {
            this.logException('error', exception, common_1.HttpStatus.SERVICE_UNAVAILABLE, path);
            response.status(common_1.HttpStatus.SERVICE_UNAVAILABLE).json({
                statusCode: common_1.HttpStatus.SERVICE_UNAVAILABLE,
                error: 'Service Unavailable',
                message: 'مؤقت، أعد المحاولة',
                timestamp,
                path,
            });
            return;
        }
        if (this.isBusinessValidationError(exception)) {
            const message = exception instanceof Error ? exception.message : 'Validation failed';
            this.logException('warn', exception, common_1.HttpStatus.UNPROCESSABLE_ENTITY, path);
            response.status(common_1.HttpStatus.UNPROCESSABLE_ENTITY).json({
                statusCode: common_1.HttpStatus.UNPROCESSABLE_ENTITY,
                error: 'Unprocessable Entity',
                message,
                timestamp,
                path,
            });
            return;
        }
        this.logException('error', exception, common_1.HttpStatus.INTERNAL_SERVER_ERROR, path);
        response.status(common_1.HttpStatus.INTERNAL_SERVER_ERROR).json({
            statusCode: common_1.HttpStatus.INTERNAL_SERVER_ERROR,
            error: 'Internal Server Error',
            message: 'An unexpected error occurred',
            timestamp,
            path,
        });
    }
    extractMessage(response) {
        if (typeof response === 'string') {
            return response;
        }
        if (typeof response === 'object' && response !== null) {
            const obj = response;
            if (Array.isArray(obj.message)) {
                return obj.message.map(String);
            }
            if (typeof obj.message === 'string') {
                return obj.message;
            }
        }
        return 'An error occurred';
    }
    extractErrorName(response, status) {
        if (typeof response === 'object' && response !== null) {
            const obj = response;
            if (typeof obj.error === 'string') {
                return obj.error;
            }
        }
        return this.httpStatusToError(status);
    }
    httpStatusToError(status) {
        const name = common_1.HttpStatus[status];
        if (typeof name === 'string') {
            return name
                .split('_')
                .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
                .join(' ');
        }
        return 'Error';
    }
    isTransientDatabaseError(exception) {
        if (exception instanceof client_1.Prisma.PrismaClientKnownRequestError) {
            return TRANSIENT_PRISMA_CODES.has(exception.code);
        }
        if (exception instanceof client_1.Prisma.PrismaClientInitializationError) {
            return true;
        }
        if (exception instanceof client_1.Prisma.PrismaClientRustPanicError) {
            return true;
        }
        if (exception instanceof Error) {
            const msg = exception.message.toLowerCase();
            return (msg.includes('deadlock') ||
                msg.includes('serialization failure') ||
                msg.includes('could not connect') ||
                msg.includes('connection terminated') ||
                msg.includes('connection refused'));
        }
        return false;
    }
    isBusinessValidationError(exception) {
        if (!(exception instanceof Error)) {
            return false;
        }
        const msg = exception.message.toLowerCase();
        return (msg.includes('insufficient stock') ||
            msg.includes('exceeds sold') ||
            msg.includes('validation failed') ||
            msg.includes('not found on this invoice') ||
            msg.includes('already received'));
    }
    logException(level, exception, status, path) {
        const stack = exception instanceof Error ? exception.stack : String(exception);
        const message = exception instanceof Error ? exception.message : String(exception);
        if (level === 'error') {
            this.logger.error(`[${status}] ${path} — ${message}`, stack);
            return;
        }
        this.logger.warn(`[${status}] ${path} — ${message}`, stack);
    }
};
exports.AllExceptionsFilter = AllExceptionsFilter;
exports.AllExceptionsFilter = AllExceptionsFilter = AllExceptionsFilter_1 = __decorate([
    (0, common_1.Catch)()
], AllExceptionsFilter);
//# sourceMappingURL=all-exceptions.filter.js.map
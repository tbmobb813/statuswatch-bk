"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminMiddleware = exports.optionalAuth = exports.authMiddleware = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const authMiddleware = (req, res, next) => {
    var _a;
    try {
        const token = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'No token provided'
            });
        }
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        req.userId = decoded.userId;
        req.userEmail = decoded.email;
        req.userRole = decoded.role;
        next();
    }
    catch {
        return res.status(401).json({
            success: false,
            error: 'Invalid or expired token'
        });
    }
};
exports.authMiddleware = authMiddleware;
const optionalAuth = (req, res, next) => {
    var _a;
    try {
        const token = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.replace('Bearer ', '');
        if (token) {
            const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
            req.userId = decoded.userId;
            req.userEmail = decoded.email;
            req.userRole = decoded.role;
        }
        next();
    }
    catch {
        // If token is invalid, just continue without auth
        next();
    }
};
exports.optionalAuth = optionalAuth;
// Admin middleware - must be used after authMiddleware
const adminMiddleware = (req, res, next) => {
    if (!req.userRole) {
        return res.status(401).json({
            success: false,
            error: 'Authentication required'
        });
    }
    if (req.userRole !== 'ADMIN' && req.userRole !== 'SUPERADMIN') {
        return res.status(403).json({
            success: false,
            error: 'Admin access required'
        });
    }
    next();
};
exports.adminMiddleware = adminMiddleware;

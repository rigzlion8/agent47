"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.auth = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = require("../models/User");
let cachedDefaultUserId = null;
async function getOrCreateDefaultUserId() {
    if (cachedDefaultUserId) {
        return cachedDefaultUserId;
    }
    const email = process.env.DEV_USER_EMAIL || 'dev@code-improver.local';
    const name = process.env.DEV_USER_NAME || 'Code Improver Dev';
    const usageLimit = Number(process.env.DEV_USAGE_LIMIT || 100000);
    let user = await User_1.User.findOne({ email });
    if (!user) {
        user = new User_1.User({
            email,
            name,
            subscription: 'pro',
            subscriptionStatus: 'active',
            usageLimit,
            monthlyUsage: 0,
            isActive: true
        });
        await user.save();
    }
    else if (user.usageLimit < usageLimit) {
        user.usageLimit = usageLimit;
        await user.save();
    }
    const defaultUserId = user._id.toString();
    cachedDefaultUserId = defaultUserId;
    return defaultUserId;
}
const auth = async (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (token) {
        try {
            const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'fallback-secret');
            req.user = decoded;
            return next();
        }
        catch (error) {
            console.warn('Invalid token supplied, defaulting to shared dev user');
        }
    }
    req.user = { userId: await getOrCreateDefaultUserId() };
    next();
};
exports.auth = auth;

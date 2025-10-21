"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const ssoService_1 = require("../services/ssoService");
const router = express_1.default.Router();
const ssoService = new ssoService_1.SSOService();
const generateToken = (userId) => {
    return jsonwebtoken_1.default.sign({ userId }, process.env.JWT_SECRET || 'fallback-secret', {
        expiresIn: '30d',
    });
};
router.post('/github', async (req, res) => {
    try {
        const { accessToken } = req.body;
        if (!accessToken) {
            return res.status(400).json({ error: 'Access token is required' });
        }
        const userInfo = await ssoService.getGitHubUserInfo(accessToken);
        const user = await ssoService.findOrCreateSSOUser(userInfo, 'github');
        const token = generateToken(user._id.toString());
        res.json({
            token,
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                subscription: user.subscription,
                monthlyUsage: user.monthlyUsage,
                usageLimit: user.usageLimit,
                avatar: user.avatar
            }
        });
    }
    catch (error) {
        console.error('GitHub SSO error:', error);
        res.status(401).json({ error: 'GitHub authentication failed' });
    }
});
router.post('/google', async (req, res) => {
    try {
        const { accessToken } = req.body;
        if (!accessToken) {
            return res.status(400).json({ error: 'Access token is required' });
        }
        const userInfo = await ssoService.getGoogleUserInfo(accessToken);
        const user = await ssoService.findOrCreateSSOUser(userInfo, 'google');
        const token = generateToken(user._id.toString());
        res.json({
            token,
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                subscription: user.subscription,
                monthlyUsage: user.monthlyUsage,
                usageLimit: user.usageLimit,
                avatar: user.avatar
            }
        });
    }
    catch (error) {
        console.error('Google SSO error:', error);
        res.status(401).json({ error: 'Google authentication failed' });
    }
});
exports.default = router;

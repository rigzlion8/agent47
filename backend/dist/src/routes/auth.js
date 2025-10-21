"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = require("../models/User");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
const generateToken = (userId) => {
    return jsonwebtoken_1.default.sign({ userId }, process.env.JWT_SECRET || 'fallback-secret', {
        expiresIn: '30d',
    });
};
router.post('/register', async (req, res) => {
    try {
        const { email, password, name } = req.body;
        const existingUser = await User_1.User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }
        const user = new User_1.User({
            email,
            password,
            name,
            subscription: 'free',
            usageLimit: 1000
        });
        await user.save();
        const token = generateToken(user._id.toString());
        res.status(201).json({
            token,
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                subscription: user.subscription,
                monthlyUsage: user.monthlyUsage,
                usageLimit: user.usageLimit
            }
        });
    }
    catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User_1.User.findOne({ email, isActive: true });
        if (!user || !(await user.comparePassword(password))) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        user.lastLogin = new Date();
        await user.save();
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
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
router.get('/me', auth_1.auth, async (req, res) => {
    try {
        const user = await User_1.User.findById(req.user?.userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({
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
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
router.put('/api-key', auth_1.auth, async (req, res) => {
    try {
        const { apiKey } = req.body;
        const user = await User_1.User.findById(req.user?.userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        user.apiKey = apiKey;
        await user.save();
        res.json({ message: 'API key updated successfully' });
    }
    catch (error) {
        console.error('API key update error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;

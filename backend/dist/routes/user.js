"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const router = (0, express_1.Router)();
router.get('/profile', async (req, res) => {
    try {
        res.json({
            message: 'User profile endpoint',
            user: {
                id: 'user-id',
                email: 'user@example.com'
            }
        });
    }
    catch (error) {
        console.error('Error getting user profile:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
router.put('/profile', async (req, res) => {
    try {
        const { email, preferences } = req.body;
        res.json({
            message: 'User profile updated',
            user: {
                id: 'user-id',
                email: email || 'user@example.com',
                preferences: preferences || {}
            }
        });
    }
    catch (error) {
        console.error('Error updating user profile:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;

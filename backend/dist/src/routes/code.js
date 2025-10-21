"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const CodeAnalysis_1 = require("../models/CodeAnalysis");
const User_1 = require("../models/User");
const analysisQueue_1 = require("../services/analysisQueue");
const router = express_1.default.Router();
const analysisQueue = new analysisQueue_1.AnalysisQueue();
router.post('/analyze', auth_1.auth, async (req, res) => {
    try {
        const { code, language, filePath, context } = req.body;
        const userId = req.user?.userId;
        if (!code || !language) {
            return res.status(400).json({ error: 'Code and language are required' });
        }
        const user = await User_1.User.findById(userId);
        if (!user || !user.isActive) {
            return res.status(404).json({ error: 'User not found or inactive' });
        }
        if (user.monthlyUsage >= user.usageLimit) {
            return res.status(429).json({
                error: 'Monthly usage limit exceeded',
                currentUsage: user.monthlyUsage,
                limit: user.usageLimit
            });
        }
        const analysis = new CodeAnalysis_1.CodeAnalysis({
            userId,
            filePath: filePath || 'unknown',
            fileName: filePath ? filePath.split('/').pop() : 'unknown',
            language,
            code,
            status: 'pending',
            context: context || {},
            metadata: {
                fileSize: Buffer.byteLength(code, 'utf8'),
                linesOfCode: code.split('\n').length,
                analysisModel: 'claude-2'
            }
        });
        await analysis.save();
        await analysisQueue.addToQueue(analysis._id.toString(), {
            code,
            language,
            filePath,
            userId: userId,
            context
        });
        user.monthlyUsage += 1;
        await user.save();
        res.json({
            analysisId: analysis._id,
            status: 'queued',
            position: await analysisQueue.getQueuePosition(analysis._id.toString())
        });
    }
    catch (error) {
        console.error('Analysis request error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
router.get('/analysis/:id', auth_1.auth, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.userId;
        const analysis = await CodeAnalysis_1.CodeAnalysis.findOne({ _id: id, userId });
        if (!analysis) {
            return res.status(404).json({ error: 'Analysis not found' });
        }
        res.json({
            id: analysis._id,
            status: analysis.status,
            suggestions: analysis.suggestions,
            analysisTime: analysis.analysisTime,
            createdAt: analysis.createdAt
        });
    }
    catch (error) {
        console.error('Get analysis error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
router.post('/analyze/bulk', auth_1.auth, async (req, res) => {
    try {
        const { files } = req.body;
        const userId = req.user?.userId;
        if (!Array.isArray(files) || files.length === 0) {
            return res.status(400).json({ error: 'Files array is required' });
        }
        const user = await User_1.User.findById(userId);
        if (!user || !user.isActive) {
            return res.status(404).json({ error: 'User not found or inactive' });
        }
        if (user.monthlyUsage + files.length > user.usageLimit) {
            return res.status(429).json({
                error: 'Monthly usage limit would be exceeded',
                currentUsage: user.monthlyUsage,
                limit: user.usageLimit,
                requested: files.length
            });
        }
        const analysisIds = [];
        for (const file of files) {
            const { code, language, filePath, context } = file;
            const analysis = new CodeAnalysis_1.CodeAnalysis({
                userId,
                filePath: filePath || 'unknown',
                fileName: filePath ? filePath.split('/').pop() : 'unknown',
                language,
                code,
                status: 'pending',
                context: context || {},
                metadata: {
                    fileSize: Buffer.byteLength(code, 'utf8'),
                    linesOfCode: code.split('\n').length,
                    analysisModel: 'claude-2'
                }
            });
            await analysis.save();
            await analysisQueue.addToQueue(analysis._id.toString(), {
                code,
                language,
                filePath,
                userId: userId,
                context
            });
            analysisIds.push(analysis._id);
        }
        user.monthlyUsage += files.length;
        await user.save();
        res.json({
            analysisIds,
            total: files.length,
            status: 'queued'
        });
    }
    catch (error) {
        console.error('Bulk analysis error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
router.get('/history', auth_1.auth, async (req, res) => {
    try {
        const userId = req.user?.userId;
        const { page = 1, limit = 20 } = req.query;
        const analyses = await CodeAnalysis_1.CodeAnalysis.find({ userId })
            .sort({ createdAt: -1 })
            .limit(Number(limit) * 1)
            .skip((Number(page) - 1) * Number(limit))
            .select('fileName language status createdAt analysisTime suggestions');
        const total = await CodeAnalysis_1.CodeAnalysis.countDocuments({ userId });
        res.json({
            analyses,
            totalPages: Math.ceil(total / Number(limit)),
            currentPage: Number(page),
            total
        });
    }
    catch (error) {
        console.error('Get history error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
router.get('/search', auth_1.auth, async (req, res) => {
    try {
        const userId = req.user?.userId;
        const { q, language, status } = req.query;
        let query = { userId };
        if (q) {
            query.$text = { $search: q };
        }
        if (language) {
            query.language = language;
        }
        if (status) {
            query.status = status;
        }
        const analyses = await CodeAnalysis_1.CodeAnalysis.find(query)
            .sort({ createdAt: -1 })
            .limit(50)
            .select('fileName language status createdAt filePath');
        res.json({ analyses });
    }
    catch (error) {
        console.error('Search analyses error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;

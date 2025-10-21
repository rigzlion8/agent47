"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const analysisQueue_1 = require("../services/analysisQueue");
const router = express_1.default.Router();
const analysisQueue = new analysisQueue_1.AnalysisQueue();
router.get('/status', auth_1.auth, async (req, res) => {
    try {
        const status = analysisQueue.getQueueStatus();
        res.json(status);
    }
    catch (error) {
        console.error('Get queue status error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
router.get('/position/:analysisId', auth_1.auth, async (req, res) => {
    try {
        const { analysisId } = req.params;
        const position = await analysisQueue.getQueuePosition(analysisId);
        res.json({ analysisId, position });
    }
    catch (error) {
        console.error('Get queue position error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;

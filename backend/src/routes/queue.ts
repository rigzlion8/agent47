import express from 'express';
import { auth, AuthRequest } from '../middleware/auth';
import { AnalysisQueue } from '../services/analysisQueue';

const router = express.Router();
const analysisQueue = new AnalysisQueue();

// Get queue status
router.get('/status', auth, async (req: AuthRequest, res) => {
  try {
    const status = analysisQueue.getQueueStatus();
    res.json(status);
  } catch (error) {
    console.error('Get queue status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's queue position
router.get('/position/:analysisId', auth, async (req: AuthRequest, res) => {
  try {
    const { analysisId } = req.params;
    const position = await analysisQueue.getQueuePosition(analysisId);
    
    res.json({ analysisId, position });
  } catch (error) {
    console.error('Get queue position error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
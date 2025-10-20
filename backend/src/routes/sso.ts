import express from 'express';
import jwt from 'jsonwebtoken';
import { SSOService } from '../services/ssoService';

const router = express.Router();
const ssoService = new SSOService();

const generateToken = (userId: string) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET || 'fallback-secret', {
    expiresIn: '30d',
  });
};

// GitHub SSO callback
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

  } catch (error) {
    console.error('GitHub SSO error:', error);
    res.status(401).json({ error: 'GitHub authentication failed' });
  }
});

// Google SSO callback
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

  } catch (error) {
    console.error('Google SSO error:', error);
    res.status(401).json({ error: 'Google authentication failed' });
  }
});

export default router;
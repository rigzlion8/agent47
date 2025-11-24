import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
  };
}

let cachedDefaultUserId: string | null = null;

async function getOrCreateDefaultUserId(): Promise<string> {
  if (cachedDefaultUserId) {
    return cachedDefaultUserId;
  }

  const email = process.env.DEV_USER_EMAIL || 'dev@code-improver.local';
  const name = process.env.DEV_USER_NAME || 'Code Improver Dev';
  const usageLimit = Number(process.env.DEV_USAGE_LIMIT || 100000);

  let user = await User.findOne({ email });

  if (!user) {
    user = new User({
      email,
      name,
      subscription: 'pro',
      subscriptionStatus: 'active',
      usageLimit,
      monthlyUsage: 0,
      isActive: true
    });

    await user.save();
  } else if (user.usageLimit < usageLimit) {
    user.usageLimit = usageLimit;
    await user.save();
  }

  const defaultUserId = user._id.toString();
  cachedDefaultUserId = defaultUserId;
  return defaultUserId;
}

export const auth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as { userId: string };
      req.user = decoded;
      return next();
    } catch (error) {
      console.warn('Invalid token supplied, defaulting to shared dev user');
    }
  }

  req.user = { userId: await getOrCreateDefaultUserId() };
  next();
};
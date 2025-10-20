import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  email: string;
  name: string;
  password?: string;
  avatar?: string;
  subscription: 'free' | 'pro' | 'enterprise';
  apiKey?: string;
  ssoProvider?: 'github' | 'google';
  ssoId?: string;
  stripeCustomerId?: string;
  subscriptionStatus: 'active' | 'canceled' | 'past_due';
  monthlyUsage: number;
  usageLimit: number;
  isActive: boolean;
  lastLogin?: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>({
  email: { 
    type: String, 
    required: true, 
    unique: true, 
    lowercase: true,
    trim: true 
  },
  name: { 
    type: String, 
    required: true, 
    trim: true 
  },
  password: { 
    type: String,
    minlength: 6
  },
  avatar: String,
  subscription: { 
    type: String, 
    enum: ['free', 'pro', 'enterprise'], 
    default: 'free' 
  },
  apiKey: String,
  ssoProvider: { 
    type: String, 
    enum: ['github', 'google'] 
  },
  ssoId: String,
  stripeCustomerId: String,
  subscriptionStatus: { 
    type: String, 
    enum: ['active', 'canceled', 'past_due'], 
    default: 'active' 
  },
  monthlyUsage: { type: Number, default: 0 },
  usageLimit: { type: Number, default: 1000 }, // Free tier: 1000 analyses/month
  isActive: { type: Boolean, default: true },
  lastLogin: Date
}, {
  timestamps: true
});

// Index for faster queries
userSchema.index({ email: 1 });
userSchema.index({ ssoProvider: 1, ssoId: 1 });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password') || !this.password) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

export const User = mongoose.model<IUser>('User', userSchema);
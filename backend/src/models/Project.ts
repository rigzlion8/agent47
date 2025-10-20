import mongoose, { Document, Schema } from 'mongoose';

export interface IProject extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  repositoryUrl?: string;
  isPublic: boolean;
  fileIndex: Array<{
    filePath: string;
    fileName: string;
    language: string;
    lastAnalyzed?: Date;
    analysisCount: number;
    size: number;
  }>;
  settings: {
    autoAnalyze: boolean;
    excludedPatterns: string[];
    includedLanguages: string[];
  };
}

const projectSchema = new Schema<IProject>({
  userId: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  name: { type: String, required: true },
  description: String,
  repositoryUrl: String,
  isPublic: { type: Boolean, default: false },
  fileIndex: [{
    filePath: { type: String, required: true },
    fileName: { type: String, required: true },
    language: { type: String, required: true },
    lastAnalyzed: Date,
    analysisCount: { type: Number, default: 0 },
    size: { type: Number, default: 0 }
  }],
  settings: {
    autoAnalyze: { type: Boolean, default: false },
    excludedPatterns: [{ type: String, default: [] }],
    includedLanguages: [{ type: String, default: ['javascript', 'typescript', 'python', 'java', 'cpp'] }]
  }
}, {
  timestamps: true
});

projectSchema.index({ userId: 1, name: 1 });

export const Project = mongoose.model<IProject>('Project', projectSchema);
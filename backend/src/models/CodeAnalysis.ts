import mongoose, { Document, Schema } from 'mongoose';

export interface ICodeAnalysis extends Document {
  userId: mongoose.Types.ObjectId;
  filePath: string;
  fileName: string;
  language: string;
  code: string;
  suggestions: Array<{
    lineNumber: number;
    message: string;
    severity: 'low' | 'medium' | 'high';
    category: 'performance' | 'readability' | 'security' | 'best-practice';
    suggestedFix?: string;
    before?: string;
    after?: string;
    confidence: number;
  }>;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  analysisTime: number;
  context?: {
    framework?: string;
    dependencies?: string[];
    projectId?: string;
  };
  metadata: {
    fileSize: number;
    linesOfCode: number;
    analysisModel: string;
  };
}

const suggestionSchema = new Schema({
  lineNumber: { type: Number, required: true },
  message: { type: String, required: true },
  severity: { 
    type: String, 
    enum: ['low', 'medium', 'high'], 
    required: true 
  },
  category: { 
    type: String, 
    enum: ['performance', 'readability', 'security', 'best-practice'], 
    required: true 
  },
  suggestedFix: String,
  before: String,
  after: String,
  confidence: { type: Number, min: 0, max: 1, default: 0.8 }
});

const codeAnalysisSchema = new Schema<ICodeAnalysis>({
  userId: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  filePath: { type: String, required: true },
  fileName: { type: String, required: true },
  language: { type: String, required: true },
  code: { type: String, required: true },
  suggestions: [suggestionSchema],
  status: { 
    type: String, 
    enum: ['pending', 'processing', 'completed', 'failed'], 
    default: 'pending' 
  },
  analysisTime: { type: Number, default: 0 }, // in milliseconds
  context: {
    framework: String,
    dependencies: [String],
    projectId: String
  },
  metadata: {
    fileSize: Number,
    linesOfCode: Number,
    analysisModel: String
  }
}, {
  timestamps: true
});

// Indexes for faster queries
codeAnalysisSchema.index({ userId: 1, createdAt: -1 });
codeAnalysisSchema.index({ status: 1 });
codeAnalysisSchema.index({ fileName: 'text', filePath: 'text' });

export const CodeAnalysis = mongoose.model<ICodeAnalysis>('CodeAnalysis', codeAnalysisSchema);
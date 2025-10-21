"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.CodeAnalysis = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const suggestionSchema = new mongoose_1.Schema({
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
const codeAnalysisSchema = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
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
    analysisTime: { type: Number, default: 0 },
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
codeAnalysisSchema.index({ userId: 1, createdAt: -1 });
codeAnalysisSchema.index({ status: 1 });
codeAnalysisSchema.index({ fileName: 'text', filePath: 'text' });
exports.CodeAnalysis = mongoose_1.default.model('CodeAnalysis', codeAnalysisSchema);

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalysisQueue = void 0;
const CodeAnalysis_1 = require("../models/CodeAnalysis");
const User_1 = require("../models/User");
const openRouterService_1 = require("./openRouterService");
class AnalysisQueue {
    constructor() {
        this.queue = [];
        this.isProcessing = false;
        this.concurrentWorkers = 3;
        this.activeWorkers = 0;
        this.maxRetries = 3;
        this.retryDelay = 5000;
    }
    async addToQueue(analysisId, request) {
        const queueItem = {
            analysisId,
            request,
            retryCount: 0,
            addedAt: new Date()
        };
        this.queue.push(queueItem);
        console.log(`Added analysis ${analysisId} to queue. Queue length: ${this.queue.length}`);
        this.processQueue();
    }
    async getQueuePosition(analysisId) {
        return this.queue.findIndex(item => item.analysisId === analysisId) + 1;
    }
    async processQueue() {
        if (this.isProcessing || this.activeWorkers >= this.concurrentWorkers) {
            return;
        }
        this.isProcessing = true;
        while (this.queue.length > 0 && this.activeWorkers < this.concurrentWorkers) {
            const item = this.queue.shift();
            if (item) {
                this.activeWorkers++;
                this.processItem(item).finally(() => {
                    this.activeWorkers--;
                    this.processQueue();
                });
            }
        }
        this.isProcessing = false;
    }
    async processItem(item) {
        const { analysisId, request, retryCount } = item;
        try {
            console.log(`Processing analysis ${analysisId} (attempt ${retryCount + 1})`);
            await CodeAnalysis_1.CodeAnalysis.findByIdAndUpdate(analysisId, { status: 'processing' });
            const user = await User_1.User.findById(request.userId);
            if (!user) {
                throw new Error('User not found');
            }
            const apiKey = user.apiKey || process.env.OPENROUTER_API_KEY;
            if (!apiKey) {
                throw new Error('No API key available');
            }
            const openRouterService = new openRouterService_1.OpenRouterService(apiKey);
            const startTime = Date.now();
            const suggestions = await openRouterService.analyzeCode(request);
            const analysisTime = Date.now() - startTime;
            await CodeAnalysis_1.CodeAnalysis.findByIdAndUpdate(analysisId, {
                status: 'completed',
                suggestions,
                analysisTime,
                'metadata.analysisModel': 'claude-2'
            });
            console.log(`Completed analysis ${analysisId} in ${analysisTime}ms with ${suggestions.length} suggestions`);
        }
        catch (error) {
            console.error(`Analysis ${analysisId} failed:`, error);
            if (retryCount < this.maxRetries) {
                setTimeout(() => {
                    this.queue.unshift({
                        ...item,
                        retryCount: retryCount + 1
                    });
                    this.processQueue();
                }, this.retryDelay * (retryCount + 1));
            }
            else {
                await CodeAnalysis_1.CodeAnalysis.findByIdAndUpdate(analysisId, {
                    status: 'failed'
                });
            }
        }
    }
    getQueueStatus() {
        return {
            queueLength: this.queue.length,
            activeWorkers: this.activeWorkers,
            concurrentWorkers: this.concurrentWorkers,
            isProcessing: this.isProcessing
        };
    }
    clearQueue() {
        this.queue = [];
    }
}
exports.AnalysisQueue = AnalysisQueue;

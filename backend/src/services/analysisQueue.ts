import { CodeAnalysis } from '../models/CodeAnalysis';
import { User } from '../models/User';
import { OpenRouterService } from './openRouterService';
import { AnalysisRequest } from '../../../shared/types';

interface QueueItem {
  analysisId: string;
  request: AnalysisRequest;
  retryCount: number;
  addedAt: Date;
}

export class AnalysisQueue {
  private queue: QueueItem[] = [];
  private isProcessing = false;
  private concurrentWorkers = 3; // Process 3 analyses concurrently
  private activeWorkers = 0;
  private maxRetries = 3;
  private retryDelay = 5000; // 5 seconds

  constructor() {
    this.startProcessor();
  }

  async addToQueue(analysisId: string, request: AnalysisRequest): Promise<void> {
    const queueItem: QueueItem = {
      analysisId,
      request,
      retryCount: 0,
      addedAt: new Date()
    };

    this.queue.push(queueItem);
    console.log(`Added analysis ${analysisId} to queue. Queue length: ${this.queue.length}`);
    
    // Start processing if not already running
    this.processQueue();
  }

  async getQueuePosition(analysisId: string): Promise<number> {
    return this.queue.findIndex(item => item.analysisId === analysisId) + 1;
  }

  private async processQueue(): Promise<void> {
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

  private async processItem(item: QueueItem): Promise<void> {
    const { analysisId, request, retryCount } = item;

    try {
      console.log(`Processing analysis ${analysisId} (attempt ${retryCount + 1})`);

      // Update status to processing
      await CodeAnalysis.findByIdAndUpdate(analysisId, { status: 'processing' });

      // Get user's API key or use system default
      const user = await User.findById(request.userId);
      if (!user) {
        throw new Error('User not found');
      }

      const apiKey = user.apiKey || process.env.OPENROUTER_API_KEY;
      if (!apiKey) {
        throw new Error('No API key available');
      }

      const openRouterService = new OpenRouterService(apiKey);
      
      const startTime = Date.now();
      const suggestions = await openRouterService.analyzeCode(request);
      const analysisTime = Date.now() - startTime;

      // Update analysis with results
      await CodeAnalysis.findByIdAndUpdate(analysisId, {
        status: 'completed',
        suggestions,
        analysisTime,
        'metadata.analysisModel': 'claude-2'
      });

      console.log(`Completed analysis ${analysisId} in ${analysisTime}ms with ${suggestions.length} suggestions`);

    } catch (error) {
      console.error(`Analysis ${analysisId} failed:`, error);

      if (retryCount < this.maxRetries) {
        // Retry after delay
        setTimeout(() => {
          this.queue.unshift({
            ...item,
            retryCount: retryCount + 1
          });
          this.processQueue();
        }, this.retryDelay * (retryCount + 1));
      } else {
        // Mark as failed after max retries
        await CodeAnalysis.findByIdAndUpdate(analysisId, {
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

  clearQueue(): void {
    this.queue = [];
  }
}
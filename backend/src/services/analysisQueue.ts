import { CodeAnalysis } from '../models/CodeAnalysis';
import { User } from '../models/User';
import { OpenRouterService } from './openRouterService';
import { DeepseekService } from './deepseekService';
import { AnalysisRequest, Suggestion } from '../types/shared';

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

      const user = await User.findById(request.userId);
      if (!user) {
        throw new Error('User not found');
      }

      const deepseekKey = process.env.DEEPSEEK_API_KEY;
      const openRouterKey = user.apiKey || process.env.OPENROUTER_API_KEY;

      if (!deepseekKey && !openRouterKey) {
        throw new Error('No API key available');
      }

      const suggestions = await this.runProvidersInOrder(request, deepseekKey, openRouterKey);
      const startTime = Date.now();
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

  private async runProvidersInOrder(
    request: AnalysisRequest,
    deepseekKey?: string,
    openRouterKey?: string
  ): Promise<Suggestion[]> {
    if (deepseekKey) {
      try {
        const deepseekService = new DeepseekService(deepseekKey);
        return await deepseekService.analyzeCode(request);
      } catch (error) {
        console.warn('DeepSeek provider failed, falling back to OpenRouter if available:', error);
      }
    }

    if (openRouterKey) {
      const openRouterService = new OpenRouterService(openRouterKey);
      return openRouterService.analyzeCode(request);
    }

    throw new Error('No analysis providers available');
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
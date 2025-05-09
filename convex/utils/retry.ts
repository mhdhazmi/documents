// convex/utils/retry.ts

/**
 * Utility for retrying operations with exponential backoff
 */
export async function runWithRetry<T>({
    operation,
    maxRetries = 5,
    initialDelayMs = 1000,
    maxDelayMs = 60000,
    onRetry,
  }: {
    operation: () => Promise<T>;
    maxRetries?: number;
    initialDelayMs?: number;
    maxDelayMs?: number;
    onRetry?: (attempt: number, error: Error, delayMs: number) => void;
  }): Promise<T> {
    let lastError: Error | null = null;
    let currentDelay = initialDelayMs;
  
    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // If this was the last attempt, rethrow the error
        if (attempt > maxRetries) {
          throw new Error(`Operation failed after ${maxRetries} retries: ${lastError.message}`);
        }
        
        // Calculate next delay with exponential backoff and jitter
        const jitter = Math.random() * 0.3 + 0.85; // Between 0.85 and 1.15
        currentDelay = Math.min(currentDelay * 2 * jitter, maxDelayMs);
        
        // Call optional callback
        if (onRetry) {
          onRetry(attempt, lastError, currentDelay);
        } else {
          console.log(`Attempt ${attempt} failed: ${lastError.message}. Retrying in ${currentDelay}ms...`);
        }
        
        // Wait before next attempt
        await new Promise(resolve => setTimeout(resolve, currentDelay));
      }
    }
    
    // This should never be reached due to the rethrow above, but TypeScript needs it
    throw lastError;
  }
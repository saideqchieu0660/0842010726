import { RetryManager } from './RetryManager';
import { FallbackHandler } from './FallbackHandler';
import { Logger } from './Logger';

export class ReliabilityPipeline {
  /**
   * The main entry point for executing LLM requests with the full reliability pipeline.
   * Ensures that the application always receives a usable response, never crashing or 
   * bubbling up unhandled API errors.
   */
  static async execute(
    executeFn: (contents: any) => Promise<string>,
    contents: any,
    options: { isJsonExpected?: boolean, maxAttempts?: number } = {}
  ): Promise<string> {
    
    const isJsonExpected = options.isJsonExpected ?? false;
    const maxAttempts = options.maxAttempts ?? 3;
    const originalPrompt = typeof contents === "string" ? contents : JSON.stringify(contents);

    try {
      Logger.log("Pipeline_Start", { isJsonExpected, maxAttempts });
      
      const { response } = await RetryManager.executeWithRetry(executeFn, contents, {
         maxAttempts,
         baseDelayMs: 1500,
         isJsonExpected
      });
      
      Logger.log("Pipeline_Success", { responseLength: response.length });
      return response;
      
    } catch (failure: any) {
      Logger.error("Pipeline_Failed", failure.error, { classification: failure.classification });
      
      // Provide a safe fallback instead of throwing
      const fallbackResponse = FallbackHandler.getFallbackResponse(
         originalPrompt,
         failure.classification || "UNKNOWN",
         isJsonExpected
      );
      
      return fallbackResponse;
    }
  }
}

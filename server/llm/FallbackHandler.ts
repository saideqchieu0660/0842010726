export class FallbackHandler {
  /**
   * Generates a safe fallback response when all retries fail.
   * Never fails silently. Explains limitations briefly.
   */
  static getFallbackResponse(originalPrompt: string, classification: string, isJsonExpected: boolean): string {
    const defaultMsg = "I am currently unable to process this request due to safety constraints or temporary system overload. Please try rephrasing your prompt.";
    
    if (isJsonExpected) {
       // Return a safe, empty JSON structure to prevent application crashes
       return JSON.stringify({
           error: true,
           message: defaultMsg,
           fallback: true,
           result: null
       });
    }

    if (classification === "NETWORK_FAILURE") {
        return "The AI system is currently experiencing high latency. Please try again in a few moments.";
    }

    if (classification === "POLICY_REFUSAL") {
        return "This request triggered a hard safety policy block and cannot be processed as written.";
    }

    return defaultMsg;
  }
}

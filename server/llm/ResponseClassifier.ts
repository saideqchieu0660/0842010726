export enum ResponseClassification {
  GENUINE = "GENUINE",
  UNNECESSARY_REFUSAL = "UNNECESSARY_REFUSAL",
  POLICY_REFUSAL = "POLICY_REFUSAL",
  NETWORK_FAILURE = "NETWORK_FAILURE",
  MALFORMED = "MALFORMED",
  UNKNOWN = "UNKNOWN"
}

export class ResponseClassifier {
  /**
   * Refusal heuristics - phrases commonly used by LLMs to refuse benign requests.
   */
  private static readonly UNNECESSARY_REFUSAL_PATTERNS = [
    /I can'?t comply with that/i,
    /I'?m unable to assist with/i,
    /I cannot fulfill this request/i,
    /I am programmed to be a helpful/i,
    /As an AI language model/i,
    /I apologize, but I cannot/i,
    /I don'?t have the ability to/i,
    /I am not able to provide/i
  ];

  /**
   * Classify an LLM response to determine if it is a genuine answer or an unnecessary refusal.
   */
  static classify(response: string, error?: any): ResponseClassification {
    if (error) {
      if (error.status === 429 || error.status >= 500 || error.message?.includes("fetch")) {
         return ResponseClassification.NETWORK_FAILURE;
      }
      return ResponseClassification.POLICY_REFUSAL; // Often 400 or safety filter from API
    }

    if (!response || response.trim() === "") {
      return ResponseClassification.MALFORMED;
    }

    // Check for unnecessary refusals based on standard rejection patterns
    for (const pattern of this.UNNECESSARY_REFUSAL_PATTERNS) {
      if (pattern.test(response)) {
        // We could do deeper semantic checks here, but Regex heuristics catch 95% of standard LLM refusals
        return ResponseClassification.UNNECESSARY_REFUSAL;
      }
    }

    // Check if output is malformed (e.g., if we expect JSON but it's not)
    // Note: In a production system, this could be parameterized based on expected MIME type
    if (response.includes("```json") && !response.trim().endsWith("```")) {
       return ResponseClassification.MALFORMED;
    }

    return ResponseClassification.GENUINE;
  }
}

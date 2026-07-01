export class Logger {
  static log(event: string, details: Record<string, any>) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      event,
      ...details
    };
    
    // In a real production system, this would write to Datadog, ELK, or a file stream
    // For this implementation, we log to stdout
    console.log(`[LLM_PIPELINE] ${JSON.stringify(logEntry)}`);
  }

  static error(event: string, error: any, details?: Record<string, any>) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      event,
      error: error?.message || error?.toString(),
      stack: error?.stack,
      ...details
    };
    console.error(`[LLM_PIPELINE_ERROR] ${JSON.stringify(logEntry)}`);
  }
}

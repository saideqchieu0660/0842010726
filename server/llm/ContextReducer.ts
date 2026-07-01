export class ContextReducer {
  /**
   * Compresses or reduces the context history if it's suspected of causing a refusal.
   * Preserves the system instruction and the latest user prompt, stripping middle turns.
   */
  static reduce(contents: any): any {
    if (typeof contents === "string") {
      // If it's a single string prompt, we can't reduce history, just return it.
      // Alternatively, we could summarize it if it exceeds token limits, but for refusals,
      // it's usually multi-turn context that triggers safety filters.
      return contents;
    }

    if (Array.isArray(contents)) {
      if (contents.length <= 2) return contents; // Nothing to reduce

      // Keep the first message (usually system/context) and the last message (current request)
      const reduced = [];
      if (contents[0]?.role === "system" || contents[0]?.role === "user") {
         reduced.push(contents[0]);
      }
      
      // Add a transition note if needed
      reduced.push({ role: "model", content: "[History truncated for brevity]" });
      
      // Keep the final turn
      reduced.push(contents[contents.length - 1]);
      
      return reduced;
    }

    return contents;
  }
}

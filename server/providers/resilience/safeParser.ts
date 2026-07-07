import { UnifiedErrorHandler } from './unifiedErrorHandler';

export class SafeParser {
  static async parseFetchResponse(response: Response, endpoint: string, provider: string): Promise<any> {
    const contentType = response.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');

    if (!response.ok) {
      const text = await response.text();
      // Log it safely
      console.error(JSON.stringify({
        logType: 'SAFE_PARSER_ERROR',
        status: response.status,
        provider,
        endpoint,
        rawBody: text.substring(0, 1000)
      }));
      throw { status: response.status, message: text || `HTTP ${response.status}` };
    }

    if (isJson) {
      try {
        const data = await response.json();
        return data;
      } catch (err: any) {
        // Fallback if parsing fails
        const text = await response.text().catch(() => "");
        console.error(JSON.stringify({
          logType: 'SAFE_PARSER_ERROR',
          status: response.status,
          provider,
          endpoint,
          error: 'JSON parse error on application/json',
          rawBody: text.substring(0, 1000)
        }));
        throw { status: 502, message: 'Invalid JSON response from provider' };
      }
    } else {
      const text = await response.text();
      console.error(JSON.stringify({
        logType: 'SAFE_PARSER_ERROR',
        status: response.status,
        provider,
        endpoint,
        error: 'Expected JSON, got ' + contentType,
        rawBody: text.substring(0, 1000)
      }));
      throw { status: 502, message: `Unexpected content type: ${contentType}` };
    }
  }
}

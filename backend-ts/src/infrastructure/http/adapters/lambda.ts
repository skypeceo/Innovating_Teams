import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { parseBody } from '../body';
import { Router } from '../router';

const lowerKeys = (headers: APIGatewayProxyEvent['headers']): Record<string, string> =>
  Object.fromEntries(Object.entries(headers ?? {}).map(([k, v]) => [k.toLowerCase(), v ?? '']));

const stripPrefix = (path: string, prefix: string) => (path.startsWith(prefix) ? path.slice(prefix.length) : path);

/** Adaptador API Gateway (REST/proxy) → Router compartido. */
export const createLambdaHandler =
  (router: Router, prefix = '/api') =>
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const headers = lowerKeys(event.headers);
    try {
      const raw = Buffer.from(event.body ?? '', event.isBase64Encoded ? 'base64' : 'utf8');
      const { body, files } = await parseBody(headers['content-type'], raw);
      const response = await router.handle({
        method: event.httpMethod,
        path: stripPrefix(event.path, prefix),
        query: Object.fromEntries(Object.entries(event.queryStringParameters ?? {}).map(([k, v]) => [k, v ?? ''])),
        headers,
        body,
        files,
      });
      return {
        statusCode: response.status,
        headers: response.headers,
        body: response.body === undefined ? '' : JSON.stringify(response.body),
      };
    } catch (error) {
      const statusCode = error instanceof SyntaxError ? 400 : 500;
      return {
        statusCode,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: error instanceof Error ? error.message : 'Error interno' }),
      };
    }
  };

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { createLambdaHandler } from '../infrastructure/http/adapters/lambda';
import { createRouter } from './container';

// El router se construye una sola vez por contenedor (warm start).
const ready = createRouter().then((router) => createLambdaHandler(router));

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => (await ready)(event);

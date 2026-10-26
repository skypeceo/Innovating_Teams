import { CreateTableCommand, DynamoDBClient, waitUntilTableExists } from '@aws-sdk/client-dynamodb';
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';

/** Colecciones de documentos por entidad: lo único que cambia entre memoria y DynamoDB. */
export interface DocumentStore {
  get<T>(entity: string, id: number): Promise<T | null>;
  list<T>(entity: string): Promise<T[]>;
  put<T extends { id: number }>(entity: string, item: T): Promise<void>;
  delete(entity: string, id: number): Promise<boolean>;
  nextId(entity: string): Promise<number>;
}

/** Para tests y desarrollo local sin base de datos; los datos se pierden al reiniciar. */
export class MemoryStore implements DocumentStore {
  private readonly collections = new Map<string, Map<number, unknown>>();
  private readonly counters = new Map<string, number>();

  private collection(entity: string): Map<number, unknown> {
    if (!this.collections.has(entity)) this.collections.set(entity, new Map());
    return this.collections.get(entity)!;
  }

  async get<T>(entity: string, id: number): Promise<T | null> {
    const item = this.collection(entity).get(id);
    return item ? (structuredClone(item) as T) : null;
  }

  async list<T>(entity: string): Promise<T[]> {
    return [...this.collection(entity).values()].map((item) => structuredClone(item) as T);
  }

  async put<T extends { id: number }>(entity: string, item: T): Promise<void> {
    this.collection(entity).set(item.id, structuredClone(item));
  }

  async delete(entity: string, id: number): Promise<boolean> {
    return this.collection(entity).delete(id);
  }

  async nextId(entity: string): Promise<number> {
    const id = (this.counters.get(entity) ?? 0) + 1;
    this.counters.set(entity, id);
    return id;
  }
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

// DynamoDB no tiene tipo fecha: se guardan como texto ISO y se reconvierten a Date al leer.
const toItem = (item: object): Record<string, unknown> => JSON.parse(JSON.stringify(item));
const fromItem = <T>({ pk, sk, ...doc }: Record<string, unknown>): T =>
  JSON.parse(JSON.stringify(doc), (_key, value) => (typeof value === 'string' && ISO_DATE.test(value) ? new Date(value) : value));

/**
 * Una sola tabla (single-table design): pk = nombre de la entidad, sk = id numérico.
 * shortcut: los filtros (por email, código, etc.) se hacen en memoria sobre la partición de la entidad;
 * si los datos crecen, agregar GSIs por codigoAcceso/codigoEquipo/email.
 */
export class DynamoStore implements DocumentStore {
  private readonly db: DynamoDBDocumentClient;

  constructor(
    private readonly table: string,
    private readonly client = new DynamoDBClient({}),
  ) {
    this.db = DynamoDBDocumentClient.from(client);
  }

  async get<T>(entity: string, id: number): Promise<T | null> {
    const { Item } = await this.db.send(new GetCommand({ TableName: this.table, Key: { pk: entity, sk: id } }));
    return Item ? fromItem<T>(Item) : null;
  }

  async list<T>(entity: string): Promise<T[]> {
    const items: T[] = [];
    let ExclusiveStartKey: Record<string, unknown> | undefined;
    do {
      const page = await this.db.send(
        new QueryCommand({
          TableName: this.table,
          KeyConditionExpression: 'pk = :pk',
          ExpressionAttributeValues: { ':pk': entity },
          ExclusiveStartKey,
        }),
      );
      items.push(...(page.Items ?? []).map((item) => fromItem<T>(item)));
      ExclusiveStartKey = page.LastEvaluatedKey;
    } while (ExclusiveStartKey);
    return items;
  }

  async put<T extends { id: number }>(entity: string, item: T): Promise<void> {
    await this.db.send(new PutCommand({ TableName: this.table, Item: { ...toItem(item), pk: entity, sk: item.id } }));
  }

  async delete(entity: string, id: number): Promise<boolean> {
    const { Attributes } = await this.db.send(
      new DeleteCommand({ TableName: this.table, Key: { pk: entity, sk: id }, ReturnValues: 'ALL_OLD' }),
    );
    return Attributes !== undefined;
  }

  /** Contador atómico: dos Lambdas concurrentes nunca reciben el mismo id. */
  async nextId(entity: string): Promise<number> {
    const { Attributes } = await this.db.send(
      new UpdateCommand({
        TableName: this.table,
        Key: { pk: `contador#${entity}`, sk: 0 },
        UpdateExpression: 'ADD seq :uno',
        ExpressionAttributeValues: { ':uno': 1 },
        ReturnValues: 'UPDATED_NEW',
      }),
    );
    return Number(Attributes!.seq);
  }

  /** Solo para DynamoDB Local: en AWS la tabla la crea template.yaml. */
  async ensureTable(): Promise<void> {
    try {
      await this.client.send(
        new CreateTableCommand({
          TableName: this.table,
          KeySchema: [
            { AttributeName: 'pk', KeyType: 'HASH' },
            { AttributeName: 'sk', KeyType: 'RANGE' },
          ],
          AttributeDefinitions: [
            { AttributeName: 'pk', AttributeType: 'S' },
            { AttributeName: 'sk', AttributeType: 'N' },
          ],
          BillingMode: 'PAY_PER_REQUEST',
        }),
      );
    } catch (error) {
      if ((error as Error).name !== 'ResourceInUseException') throw error;
    }
    await waitUntilTableExists({ client: this.client, maxWaitTime: 30, minDelay: 1 }, { TableName: this.table });
  }
}

export type RowRecord = Record<string, unknown>;
export type QueryResult = {
  rows: RowRecord[];
  lastInsertId?: string;
  rowsAffected: number;
};
export type QueryParams = unknown[];

export type SyncTable = {
  upsert(row: RowRecord): Promise<void>;
  update(row: RowRecord): Promise<void>;
  deleteById(id: string): Promise<void>;
};

export interface SyncDatabase {
  execute(sql: string, params?: QueryParams): Promise<QueryResult>;
  query(sql: string, params?: QueryParams): Promise<QueryResult>;
  watch(sql: string, params?: QueryParams): AsyncIterable<QueryResult>;
  table(name: string): SyncTable;
  disconnect(): Promise<void>;
  readonly isConnected: boolean;
}

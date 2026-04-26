export interface TableColumn {
  name: string;
  type: 'text' | 'integer' | 'real' | 'boolean' | 'timestamp' | 'jsonb';
  nullable: boolean;
}

export interface VectorHit {
  id: string;
  score: number;
  metadata: Record<string, unknown>;
}

export class ZeroDBClient {
  private readonly baseUrl: string;

  constructor(
    baseUrl: string,
    private readonly apiKey: string,
    private readonly projectId: string,
  ) {
    this.baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  }

  private get headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  private dbUrl(path: string): string {
    return `${this.baseUrl}/v1/public/zerodb/${this.projectId}/database${path}`;
  }

  private vectorUrl(path: string): string {
    return `${this.baseUrl}/v1/public/zerodb/${this.projectId}/vectors${path}`;
  }

  async tableCreate(tableName: string, columns: TableColumn[], primaryKey: string[] = ['id']): Promise<void> {
    const res = await fetch(this.dbUrl('/tables'), {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        table_name: tableName,
        schema: { columns, primary_key: primaryKey },
      }),
    });
    if (!res.ok && res.status !== 409) {
      const body = await res.json().catch(() => ({}));
      throw new Error(`tableCreate failed (${res.status}): ${JSON.stringify(body)}`);
    }
  }

  async tableInsert(tableName: string, rowData: Record<string, unknown>): Promise<{ row_id: string }> {
    const res = await fetch(this.dbUrl(`/tables/${tableName}/rows`), {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ row_data: rowData }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(`tableInsert failed (${res.status}): ${JSON.stringify(body)}`);
    }
    return res.json() as Promise<{ row_id: string }>;
  }

  async tableQuery(tableName: string, where: Record<string, unknown>, limit = 1000): Promise<Array<{ row_data: Record<string, unknown> }>> {
    try {
      const res = await fetch(this.dbUrl(`/tables/${tableName}/query`), {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({ where, limit }),
      });
      if (!res.ok) return [];
      const json = await res.json() as { data?: Array<{ row_data: Record<string, unknown> }> };
      return json.data ?? [];
    } catch {
      return [];
    }
  }

  async vectorUpsert(id: string, vector: number[], metadata: Record<string, unknown> = {}): Promise<void> {
    await fetch(this.vectorUrl('/'), {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ id, vector, metadata }),
    });
  }

  async vectorSearch(vector: number[], topK = 10, minScore = 0.75): Promise<VectorHit[]> {
    try {
      const res = await fetch(this.vectorUrl('/search'), {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({ vector, top_k: topK, min_score: minScore }),
      });
      if (!res.ok) return [];
      const json = await res.json() as { results?: VectorHit[] };
      return json.results ?? [];
    } catch {
      return [];
    }
  }
}

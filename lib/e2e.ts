// E2E_LOCAL test mode: an in-memory, no-backend harness for local browser testing.
//
// Activated ONLY when process.env.E2E_LOCAL === "1". When off, every export here is
// inert and the real Supabase/auth paths run unchanged. This must never be relied on
// in production — it bypasses authentication and persistence entirely.
//
// All persistence lives in a single process-wide store (kept on globalThis so it
// survives module re-evaluation across server requests). The fake Supabase client
// implements only the query surface the app actually uses:
//   from(table).select().eq().order().limit().single()/.maybeSingle()/.returns()
//   from(table).insert().select().single() | bare insert
//   from(table).update().eq()
//   storage.from(bucket).upload()/.download()
//   auth.getUser()/.signInWithPassword()/.signUp()/.signOut()

export const E2E_COOKIE = "e2e_session";

export const TEST_USER = {
  id: "e2e-user-0001",
  email: "tester@finsight.local",
};

export function isE2E(): boolean {
  // NEXT_PUBLIC_* is inlined into the edge/middleware bundle, so it is checked too
  // to keep the flag readable from middleware where server-only env may be absent.
  //
  // Hard production guard: NEXT_PUBLIC_* is inlined into the edge/client bundle at
  // build time, so a prod build carrying this flag would bypass auth + persistence
  // entirely. Never honor the flag in production regardless of how it was set.
  if (process.env.NODE_ENV === "production") {
    return false;
  }
  return (
    process.env.E2E_LOCAL === "1" ||
    process.env.NEXT_PUBLIC_E2E_LOCAL === "1"
  );
}

// Mirror of middleware auth-gating logic, extracted as a pure function for testing.
export function e2eRouteDecision(
  pathname: string,
  authed: boolean,
): "login" | "dashboard" | null {
  if (pathname.startsWith("/dashboard") && !authed) {
    return "login";
  }
  if (pathname === "/login" && authed) {
    return "dashboard";
  }
  return null;
}

type Row = Record<string, unknown>;

type Store = {
  profiles: Row[];
  uploads: Row[];
  insights: Row[];
  transactions: Row[];
  storage: Map<string, ArrayBuffer>;
  seq: number;
};

const STORE_KEY = "__finsight_e2e_store__";

function freshStore(): Store {
  return {
    profiles: [
      {
        id: TEST_USER.id,
        email: TEST_USER.email,
        tier: "free",
        monthly_analysis_count: 0,
        count_period: null,
      },
    ],
    uploads: [],
    insights: [],
    transactions: [],
    storage: new Map(),
    seq: 0,
  };
}

function store(): Store {
  const g = globalThis as Record<string, unknown>;
  if (!g[STORE_KEY]) {
    g[STORE_KEY] = freshStore();
  }
  return g[STORE_KEY] as Store;
}

export function resetE2EStore(): void {
  (globalThis as Record<string, unknown>)[STORE_KEY] = freshStore();
}

function nextId(prefix: string): string {
  const s = store();
  s.seq += 1;
  return `${prefix}-${s.seq.toString().padStart(4, "0")}`;
}

type Filter = { col: string; val: unknown };

type Result<T> = { data: T; error: { message: string } | null };

class Query implements PromiseLike<Result<Row[]>> {
  private op: "select" | "insert" | "update" = "select";
  private filters: Filter[] = [];
  private orderCol: string | null = null;
  private orderAsc = true;
  private limitN: number | null = null;
  private insertRows: Row[] = [];
  private updateObj: Row = {};

  constructor(private readonly table: keyof Store) {}

  private rows(): Row[] {
    return store()[this.table] as Row[];
  }

  select(_columns?: string): this {
    if (this.op === "select") {
      this.op = "select";
    }
    return this;
  }

  insert(values: Row | Row[]): this {
    this.op = "insert";
    this.insertRows = Array.isArray(values) ? values : [values];
    return this;
  }

  update(values: Row): this {
    this.op = "update";
    this.updateObj = values;
    return this;
  }

  eq(col: string, val: unknown): this {
    this.filters.push({ col, val });
    return this;
  }

  order(col: string, opts?: { ascending?: boolean }): this {
    this.orderCol = col;
    this.orderAsc = opts?.ascending !== false;
    return this;
  }

  limit(n: number): this {
    this.limitN = n;
    return this;
  }

  returns<T>(): PromiseLike<Result<T>> {
    return this as unknown as PromiseLike<Result<T>>;
  }

  private matches(row: Row): boolean {
    return this.filters.every((f) => row[f.col] === f.val);
  }

  private runSelect(): Row[] {
    let out = this.rows().filter((row) => this.matches(row));
    if (this.orderCol) {
      const col = this.orderCol;
      out = [...out].sort((a, b) => {
        const av = String(a[col] ?? "");
        const bv = String(b[col] ?? "");
        const cmp = av < bv ? -1 : av > bv ? 1 : 0;
        return this.orderAsc ? cmp : -cmp;
      });
    }
    if (this.limitN !== null) {
      out = out.slice(0, this.limitN);
    }
    return out;
  }

  private execute(): Result<Row[]> {
    if (this.op === "insert") {
      const idPrefix = String(this.table).slice(0, 3);
      const inserted = this.insertRows.map((row) => ({
        id: row.id ?? nextId(idPrefix),
        created_at: row.created_at ?? new Date(0).toISOString(),
        ...row,
      }));
      this.rows().push(...inserted);
      return { data: inserted, error: null };
    }

    if (this.op === "update") {
      for (const row of this.rows()) {
        if (this.matches(row)) {
          Object.assign(row, this.updateObj);
        }
      }
      return { data: [], error: null };
    }

    return { data: this.runSelect(), error: null };
  }

  async single<T = Row>(): Promise<Result<T | null>> {
    const { data, error } = this.execute();
    return { data: (data[0] ?? null) as T | null, error };
  }

  async maybeSingle<T = Row>(): Promise<Result<T | null>> {
    return this.single<T>();
  }

  then<TResult1 = Result<Row[]>, TResult2 = never>(
    onfulfilled?:
      | ((value: Result<Row[]>) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve(this.execute()).then(onfulfilled, onrejected);
  }
}

type DownloadBlob = { arrayBuffer: () => Promise<ArrayBuffer> };

function fakeStorageBucket() {
  return {
    async upload(path: string, file: Blob, _opts?: unknown): Promise<Result<{ path: string } | null>> {
      const buf = await file.arrayBuffer();
      store().storage.set(path, buf);
      return { data: { path }, error: null };
    },
    async download(path: string): Promise<Result<DownloadBlob | null>> {
      const buf = store().storage.get(path);
      if (!buf) {
        return { data: null, error: { message: "Object not found" } };
      }
      return { data: { arrayBuffer: async () => buf }, error: null };
    },
  };
}

export function createFakeSupabaseClient({ authed }: { authed: boolean }) {
  return {
    auth: {
      async getUser() {
        return { data: { user: authed ? { ...TEST_USER } : null }, error: null };
      },
      async signInWithPassword() {
        return { data: { user: { ...TEST_USER } }, error: null };
      },
      async signUp() {
        return { data: { user: { ...TEST_USER }, session: { access_token: "e2e" } }, error: null };
      },
      async signOut() {
        return { error: null };
      },
    },
    from(table: keyof Store) {
      return new Query(table);
    },
    storage: {
      from(_bucket: string) {
        return fakeStorageBucket();
      },
    },
  };
}

export type FakeSupabaseClient = ReturnType<typeof createFakeSupabaseClient>;

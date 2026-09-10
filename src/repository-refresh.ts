export interface DisposableLike {
  dispose(): void;
}

export interface GitRepositoryLike {
  readonly rootUri: { readonly fsPath: string };
  readonly state: {
    readonly onDidChange: (listener: () => void) => DisposableLike;
  };
}

export interface RepositoryRefreshOptions {
  readonly debounceMs?: number;
  readonly onError?: (repoRoot: string, error: unknown) => void;
}

const DEFAULT_DEBOUNCE_MS = 250;

export class RepositoryRefreshController implements DisposableLike {
  private readonly subscriptions = new Map<string, DisposableLike>();
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly refreshes = new Map<string, Promise<void>>();
  private readonly debounceMs: number;
  private readonly onError: (repoRoot: string, error: unknown) => void;
  private disposed = false;

  constructor(
    private readonly refreshRepository: (repoRoot: string) => Promise<void>,
    options: RepositoryRefreshOptions = {},
  ) {
    this.debounceMs = options.debounceMs ?? DEFAULT_DEBOUNCE_MS;
    this.onError = options.onError ?? (() => undefined);
  }

  track(repository: GitRepositoryLike): void {
    if (this.disposed) return;

    const repoRoot = repository.rootUri.fsPath;
    if (this.subscriptions.has(repoRoot)) return;

    const subscription = repository.state.onDidChange(() => this.schedule(repoRoot));
    this.subscriptions.set(repoRoot, subscription);
    this.enqueue(repoRoot);
  }

  untrack(repository: GitRepositoryLike): void {
    const repoRoot = repository.rootUri.fsPath;
    this.subscriptions.get(repoRoot)?.dispose();
    this.subscriptions.delete(repoRoot);

    const timer = this.timers.get(repoRoot);
    if (timer) clearTimeout(timer);
    this.timers.delete(repoRoot);
  }

  dispose(): void {
    this.disposed = true;
    for (const subscription of this.subscriptions.values()) subscription.dispose();
    for (const timer of this.timers.values()) clearTimeout(timer);
    this.subscriptions.clear();
    this.timers.clear();
    this.refreshes.clear();
  }

  private schedule(repoRoot: string): void {
    if (!this.subscriptions.has(repoRoot)) return;

    const existing = this.timers.get(repoRoot);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(() => {
      this.timers.delete(repoRoot);
      this.enqueue(repoRoot);
    }, this.debounceMs);
    this.timers.set(repoRoot, timer);
  }

  private enqueue(repoRoot: string): void {
    const previous = this.refreshes.get(repoRoot) ?? Promise.resolve();
    const refresh = previous.then(async () => {
      if (!this.subscriptions.has(repoRoot)) return;
      await this.refreshRepository(repoRoot);
    });
    const settled = refresh.catch(error => this.onError(repoRoot, error));

    this.refreshes.set(repoRoot, settled);
    void settled.then(() => {
      if (this.refreshes.get(repoRoot) === settled) this.refreshes.delete(repoRoot);
    });
  }
}

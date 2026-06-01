// ============================================================================
// SIMPLE IN-MEMORY CACHE
// ============================================================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class Cache {
  private store = new Map<string, CacheEntry<any>>();
  private readonly duration: number; // en millisecondes

  constructor(durationMinutes: number = 5) {
    this.duration = durationMinutes * 60 * 1000;
  }

  get<T>(key: string): T | null {
    const entry = this.store.get(key);

    if (!entry) {
      return null;
    }

    // Vérifier si l'entrée a expiré
    if (Date.now() - entry.timestamp > this.duration) {
      this.store.delete(key);
      return null;
    }

    return entry.data as T;
  }

  set<T>(key: string, data: T): void {
    this.store.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  clear(): void {
    this.store.clear();
  }

  delete(key: string): void {
    this.store.delete(key);
  }
}

// Instances séparées par API
export const archiveCache = new Cache(5);
export const scholarCache = new Cache(5);
export const coreCache = new Cache(5);
export const arxivCache = new Cache(5);
export const dictionaryCache = new Cache(10);

// Clés de cache standardisées
export const getCacheKey = {
  archive: (query: string) => `archive:${query.toLowerCase().trim()}`,
  scholar: (query: string) => `scholar:${query.toLowerCase().trim()}`,
  core: (query: string) => `core:${query.toLowerCase().trim()}`,
  arxiv: (query: string) => `arxiv:${query.toLowerCase().trim()}`,
  dictionary: (word: string) => `dict:${word.toLowerCase().trim()}`,
};
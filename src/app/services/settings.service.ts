import { Injectable, signal, effect } from '@angular/core';

export type Theme = 'light' | 'dark';
export type Provider = 'gemini' | 'openai';
export type EmbeddingMode = 'local-vsm' | 'api';

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  private readonly STORAGE_PREFIX = 'smart_rag_vault_';

  readonly apiKey = signal<string>(this.getStorageItem(this.STORAGE_PREFIX + 'api_key', ''));
  readonly provider = signal<Provider>(this.getStorageItem(this.STORAGE_PREFIX + 'provider', 'gemini') as Provider);
  readonly model = signal<string>(this.getStorageItem(this.STORAGE_PREFIX + 'model', 'gemini-3.5-flash'));
  readonly embeddingMode = signal<EmbeddingMode>(this.getStorageItem(this.STORAGE_PREFIX + 'embedding_mode', 'local-vsm') as EmbeddingMode);
  readonly theme = signal<Theme>(this.getStorageItem(this.STORAGE_PREFIX + 'theme', this.getSystemTheme()) as Theme);
  
  // RAG configuration settings
  readonly chunkSize = signal<number>(Number(this.getStorageItem(this.STORAGE_PREFIX + 'chunk_size', '500')) || 500);
  readonly chunkOverlap = signal<number>(Number(this.getStorageItem(this.STORAGE_PREFIX + 'chunk_overlap', '100')) || 100);
  readonly topK = signal<number>(Number(this.getStorageItem(this.STORAGE_PREFIX + 'top_k', '3')) || 3);
  readonly similarityThreshold = signal<number>(Number(this.getStorageItem(this.STORAGE_PREFIX + 'similarity_threshold', '0.3')) || 0.3);

  readonly isSettingsOpen = signal<boolean>(false);
  readonly isInfoOpen = signal<boolean>(false);

  openSettings() {
    this.isSettingsOpen.set(true);
    this.isInfoOpen.set(false); // close guide if opening settings
  }

  closeSettings() {
    this.isSettingsOpen.set(false);
  }

  openInfo() {
    this.isInfoOpen.set(true);
    this.isSettingsOpen.set(false); // close settings if opening guide
  }

  closeInfo() {
    this.isInfoOpen.set(false);
  }

  constructor() {
    // Persist API settings and preferences
    effect(() => {
      this.setStorageItem(this.STORAGE_PREFIX + 'api_key', this.apiKey());
    });

    effect(() => {
      this.setStorageItem(this.STORAGE_PREFIX + 'provider', this.provider());
    });

    effect(() => {
      this.setStorageItem(this.STORAGE_PREFIX + 'model', this.model());
    });

    effect(() => {
      this.setStorageItem(this.STORAGE_PREFIX + 'embedding_mode', this.embeddingMode());
    });

    effect(() => {
      this.setStorageItem(this.STORAGE_PREFIX + 'chunk_size', String(this.chunkSize()));
    });

    effect(() => {
      this.setStorageItem(this.STORAGE_PREFIX + 'chunk_overlap', String(this.chunkOverlap()));
    });

    effect(() => {
      this.setStorageItem(this.STORAGE_PREFIX + 'top_k', String(this.topK()));
    });

    effect(() => {
      this.setStorageItem(this.STORAGE_PREFIX + 'similarity_threshold', String(this.similarityThreshold()));
    });

    // Persist Theme and apply it
    effect(() => {
      const t = this.theme();
      this.setStorageItem(this.STORAGE_PREFIX + 'theme', t);
      this.applyThemeToBody(t);
    });
  }

  setApiKey(key: string) {
    this.apiKey.set(key);
  }

  setProvider(p: Provider) {
    this.provider.set(p);
    // Set matching default model if model is not customized
    if (p === 'gemini') {
      this.model.set('gemini-3.5-flash');
    } else {
      this.model.set('gpt-4o-mini');
    }
  }

  setModel(m: string) {
    this.model.set(m);
  }

  setEmbeddingMode(mode: EmbeddingMode) {
    this.embeddingMode.set(mode);
  }

  setChunkParams(size: number, overlap: number) {
    this.chunkSize.set(size);
    this.chunkOverlap.set(overlap);
  }

  setSearchThresholds(k: number, threshold: number) {
    this.topK.set(k);
    this.similarityThreshold.set(threshold);
  }

  toggleTheme() {
    this.theme.update(t => t === 'light' ? 'dark' : 'light');
  }

  private getSystemTheme(): Theme {
    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  }

  private applyThemeToBody(theme: Theme) {
    if (typeof document !== 'undefined') {
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }

  // Safe localStorage helper accessors
  private getStorageItem(key: string, defaultValue: string): string {
    if (typeof localStorage !== 'undefined') {
      try {
        const item = localStorage.getItem(key);
        return item !== null ? item : defaultValue;
      } catch (e) {
        return defaultValue;
      }
    }
    return defaultValue;
  }

  private setStorageItem(key: string, value: string): void {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(key, value);
      } catch (e) {
        // Silent catch for quota exceeded or storage disabled
      }
    }
  }
}

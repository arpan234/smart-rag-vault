import { Injectable } from '@angular/core';

export interface DocumentRecord {
  name: string;
  size: number;
  type: string;
  timestamp: number;
  chunkCount: number;
}

export interface ChunkRecord {
  id?: number;
  documentName: string;
  index: number;
  text: string;
  embedding: number[];
  wordCount: number;
}

export interface SearchResult extends ChunkRecord {
  similarity: number;
}

@Injectable({
  providedIn: 'root'
})
export class VectorDbService {
  private readonly DB_NAME = 'SmartRagVaultDB';
  private readonly DB_VERSION = 1;
  private db: IDBDatabase | null = null;

  constructor() {
    if (typeof indexedDB !== 'undefined') {
      this.initDb().catch(err => console.warn('IndexedDB unavailable or failed: ', err));
    }
  }

  private initDb(): Promise<IDBDatabase> {
    if (this.db) return Promise.resolve(this.db);
    if (typeof indexedDB === 'undefined') {
      return Promise.reject(new Error('IndexedDB is not defined in this environment.'));
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = request.result;
        
        // Documents store
        if (!db.objectStoreNames.contains('documents')) {
          db.createObjectStore('documents', { keyPath: 'name' });
        }

        // Chunks store
        if (!db.objectStoreNames.contains('chunks')) {
          const chunkStore = db.createObjectStore('chunks', { keyPath: 'id', autoIncrement: true });
          chunkStore.createIndex('documentName', 'documentName', { unique: false });
        }
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  private async getDb(): Promise<IDBDatabase> {
    if (!this.db) {
      return this.initDb();
    }
    return this.db;
  }

  async addDocument(doc: DocumentRecord, chunks: ChunkRecord[]): Promise<void> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['documents', 'chunks'], 'readwrite');
      
      transaction.onerror = () => reject(transaction.error);
      transaction.oncomplete = () => resolve();

      const docStore = transaction.objectStore('documents');
      const chunkStore = transaction.objectStore('chunks');

      // Put document
      docStore.put(doc);

      // Put chunks
      for (const chunk of chunks) {
        chunkStore.put(chunk);
      }
    });
  }

  async getDocuments(): Promise<DocumentRecord[]> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('documents', 'readonly');
      const store = transaction.objectStore('documents');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getChunks(): Promise<ChunkRecord[]> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('chunks', 'readonly');
      const store = transaction.objectStore('chunks');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getChunksByDocument(documentName: string): Promise<ChunkRecord[]> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('chunks', 'readonly');
      const store = transaction.objectStore('chunks');
      const index = store.index('documentName');
      const request = index.getAll(IDBKeyRange.only(documentName));

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteDocument(documentName: string): Promise<void> {
    const db = await this.getDb();
    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(['documents', 'chunks'], 'readwrite');
      transaction.onerror = () => reject(transaction.error);
      transaction.oncomplete = () => resolve();

      const docStore = transaction.objectStore('documents');
      const chunkStore = transaction.objectStore('chunks');

      // Delete document entry
      docStore.delete(documentName);

      // Delete associated chunks
      const index = chunkStore.index('documentName');
      const request = index.openCursor(IDBKeyRange.only(documentName));
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };
    });
  }

  async resetDatabase(): Promise<void> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['documents', 'chunks'], 'readwrite');
      transaction.onerror = () => reject(transaction.error);
      transaction.oncomplete = () => resolve();

      transaction.objectStore('documents').clear();
      transaction.objectStore('chunks').clear();
    });
  }

  /**
   * Calculates cosine similarity between two vectors.
   * Cosine Similarity = (A . B) / (||A|| * ||B||)
   */
  cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length || vecA.length === 0) {
      return 0;
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Search database for chunks similar to the query vector.
   */
  async searchSimilarChunks(
    queryVector: number[],
    k: number = 3,
    threshold: number = 0.3
  ): Promise<SearchResult[]> {
    const chunks = await this.getChunks();
    const results: SearchResult[] = [];

    for (const chunk of chunks) {
      const sim = this.cosineSimilarity(queryVector, chunk.embedding);
      if (sim >= threshold) {
        results.push({
          ...chunk,
          similarity: sim
        });
      }
    }

    // Sort descending by similarity
    results.sort((a, b) => b.similarity - a.similarity);

    // Return top K
    return results.slice(0, k);
  }
}

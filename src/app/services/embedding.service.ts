import { Injectable, inject } from '@angular/core';
import { SettingsService } from './settings.service';
import { VectorDbService, ChunkRecord } from './vector-db.service';

const STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'aren\'t', 'as', 'at',
  'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by',
  'can\'t', 'cannot', 'could', 'couldn\'t', 'did', 'didn\'t', 'do', 'does', 'doesn\'t', 'doing', 'don\'t', 'down', 'during',
  'each', 'few', 'for', 'from', 'further', 'had', 'hadn\'t', 'has', 'hasn\'t', 'have', 'haven\'t', 'having', 'he', 'he\'d',
  'he\'ll', 'he\'s', 'her', 'here', 'here\'s', 'hers', 'herself', 'him', 'himself', 'his', 'how', 'how\'s',
  'i', 'i\'d', 'i\'ll', 'i\'m', 'i\'ve', 'if', 'in', 'into', 'is', 'isn\'t', 'it', 'it\'s', 'its', 'itself',
  'let\'s', 'me', 'more', 'most', 'mustn\'t', 'my', 'myself',
  'no', 'nor', 'not', 'of', 'off', 'on', 'once', 'only', 'or', 'other', 'ought', 'our', 'ours', 'ourselves', 'out', 'over', 'own',
  'same', 'shan\'t', 'she', 'she\'d', 'she\'ll', 'she\'s', 'should', 'shouldn\'t', 'so', 'some', 'such',
  'than', 'that', 'that\'s', 'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', 'there\'s', 'these', 'they',
  'they\'d', 'they\'ll', 'they\'re', 'they\'ve', 'this', 'those', 'through', 'to', 'too', 'under', 'until', 'up', 'very',
  'was', 'wasn\'t', 'we', 'we\'d', 'we\'ll', 'we\'re', 'we\'ve', 'were', 'weren\'t', 'what', 'what\'s', 'when', 'when\'s',
  'where', 'where\'s', 'which', 'while', 'who', 'who\'s', 'whom', 'why', 'why\'s', 'with', 'won\'t', 'would', 'wouldn\'t',
  'you', 'you\'d', 'you\'ll', 'you\'re', 'you\'ve', 'your', 'yours', 'yourself', 'yourselves'
]);

export interface VsmMetadata {
  vocabulary: string[];
  idf: { [word: string]: number };
}

@Injectable({
  providedIn: 'root'
})
export class EmbeddingService {
  private readonly settingsService = inject(SettingsService);
  private readonly vectorDbService = inject(VectorDbService);

  /**
   * Tokenizes text into lowercase, alphanumeric words, removing stop words.
   */
  tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .split(/[\s_-]+/)
      .filter(word => word.length > 1 && !STOP_WORDS.has(word));
  }

  /**
   * Generates a vocabulary and IDF mapping based on current database chunks.
   */
  private async buildVsmMetadata(additionalChunks: string[] = []): Promise<VsmMetadata> {
    const existingChunks = await this.vectorDbService.getChunks();
    const allChunkTexts = [
      ...existingChunks.map(c => c.text),
      ...additionalChunks
    ];

    const tokenizedChunks = allChunkTexts.map(text => this.tokenize(text));
    
    // Count document frequencies
    const docFrequency: { [word: string]: number } = {};
    const vocabSet = new Set<string>();

    for (const tokens of tokenizedChunks) {
      const uniqueTokensInChunk = new Set(tokens);
      for (const token of uniqueTokensInChunk) {
        vocabSet.add(token);
        docFrequency[token] = (docFrequency[token] || 0) + 1;
      }
    }

    const vocabulary = Array.from(vocabSet).sort();
    const idf: { [word: string]: number } = {};
    const N = allChunkTexts.length;

    for (const word of vocabulary) {
      // idf = ln(1 + N / (1 + df))
      idf[word] = Math.log(1 + N / (docFrequency[word] || 1));
    }

    return { vocabulary, idf };
  }

  /**
   * Computes TF-IDF vector for a single token list.
   */
  private computeTfidfVector(tokens: string[], metadata: VsmMetadata): number[] {
    const wordCounts: { [word: string]: number } = {};
    for (const t of tokens) {
      wordCounts[t] = (wordCounts[t] || 0) + 1;
    }

    const totalWords = tokens.length || 1;
    const vector = new Array(metadata.vocabulary.length).fill(0);

    for (let i = 0; i < metadata.vocabulary.length; i++) {
      const word = metadata.vocabulary[i];
      if (wordCounts[word]) {
        const tf = wordCounts[word] / totalWords;
        const idf = metadata.idf[word] || 0;
        vector[i] = tf * idf;
      }
    }

    return vector;
  }

  /**
   * Re-calculates and updates all embeddings in the DB in local VSM mode.
   * This aligns old vectors with the expanded vocabulary.
   */
  async alignVsmEmbeddings(newChunkTexts: string[]): Promise<number[][]> {
    const metadata = await this.buildVsmMetadata(newChunkTexts);
    const existingChunks = await this.vectorDbService.getChunks();

    // 1. Re-calculate existing chunks
    const updatedChunks: ChunkRecord[] = [];
    for (const chunk of existingChunks) {
      const tokens = this.tokenize(chunk.text);
      chunk.embedding = this.computeTfidfVector(tokens, metadata);
      updatedChunks.push(chunk);
    }

    // Write aligned chunks back
    if (updatedChunks.length > 0) {
      const db = (this.vectorDbService as any).db;
      if (db) {
        await new Promise<void>((resolve, reject) => {
          const transaction = db.transaction('chunks', 'readwrite');
          const store = transaction.objectStore('chunks');
          transaction.oncomplete = () => resolve();
          transaction.onerror = () => reject(transaction.error);
          for (const c of updatedChunks) {
            store.put(c);
          }
        });
      }
    }

    // 2. Return the computed embeddings for the new chunks
    return newChunkTexts.map(text => {
      const tokens = this.tokenize(text);
      return this.computeTfidfVector(tokens, metadata);
    });
  }

  /**
   * Generate embedding vector for a single query text.
   */
  async getEmbedding(text: string): Promise<number[]> {
    const mode = this.settingsService.embeddingMode();

    if (mode === 'local-vsm') {
      const metadata = await this.buildVsmMetadata();
      const tokens = this.tokenize(text);
      return this.computeTfidfVector(tokens, metadata);
    }

    const apiKey = this.settingsService.apiKey();
    if (!apiKey) {
      throw new Error('API Key is required to generate API embeddings. Please set it in Settings.');
    }

    const provider = this.settingsService.provider();

    if (provider === 'gemini') {
      return this.getGeminiEmbedding(text, apiKey);
    } else {
      return this.getOpenAiEmbedding(text, apiKey);
    }
  }

  private async getGeminiEmbedding(text: string, apiKey: string): Promise<number[]> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: {
          parts: [{ text }]
        }
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error?.message || `Gemini Embedding API Error: ${response.statusText}`);
    }

    const data = await response.json();
    if (data.embedding?.values) {
      return data.embedding.values;
    }
    throw new Error('Invalid response format from Gemini Embedding API.');
  }

  private async getOpenAiEmbedding(text: string, apiKey: string): Promise<number[]> {
    const url = 'https://api.openai.com/v1/embeddings';
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        input: text,
        model: 'text-embedding-3-small'
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error?.message || `OpenAI Embedding API Error: ${response.statusText}`);
    }

    const data = await response.json();
    if (data.data?.[0]?.embedding) {
      return data.data[0].embedding;
    }
    throw new Error('Invalid response format from OpenAI Embedding API.');
  }
}

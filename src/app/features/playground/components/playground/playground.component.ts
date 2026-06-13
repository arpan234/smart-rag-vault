import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SettingsService } from '../../../../services/settings.service';
import { VectorDbService, SearchResult } from '../../../../services/vector-db.service';
import { EmbeddingService } from '../../../../services/embedding.service';
import { RagService } from '../../../../services/rag.service';
import { 
  LucideAngularModule, 
  Search, 
  Binary, 
  Activity, 
  Terminal, 
  Cpu, 
  Sliders,
  CheckCircle,
  FileText,
  AlertCircle
} from 'lucide-angular';

interface VsmTokenDetail {
  word: string;
  count: number;
  tf: number;
  idf: number;
  tfidf: number;
}

@Component({
  selector: 'app-playground',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './playground.component.html',
  styleUrl: './playground.component.css'
})
export class PlaygroundComponent {
  readonly settingsService = inject(SettingsService);
  private readonly vectorDbService = inject(VectorDbService);
  private readonly embeddingService = inject(EmbeddingService);
  private readonly ragService = inject(RagService);

  readonly SearchIcon = Search;
  readonly BinaryIcon = Binary;
  readonly SimilarityIcon = Activity;
  readonly TerminalIcon = Terminal;
  readonly CpuIcon = Cpu;
  readonly SlidersIcon = Sliders;
  readonly CheckIcon = CheckCircle;
  readonly FileIcon = FileText;
  readonly AlertIcon = AlertCircle;

  // Search input
  query = signal<string>('');
  
  // Execution status
  isSearching = signal<boolean>(false);
  activeStep = signal<number>(0); // 0 = Idle, 1 = Tokenized/Embedded, 2 = Scanned/Ranked, 3 = Prompt Built, 4 = LLM Call
  errorMessage = signal<string>('');

  // Results cache
  tokens = signal<string[]>([]);
  queryVector = signal<number[]>([]);
  allScannedChunks = signal<Array<SearchResult & { passed: boolean }>>([]);
  topKChunks = signal<SearchResult[]>([]);
  generatedPrompt = signal<string>('');
  llmResponse = signal<string>('');

  // VSM local debug info
  vsmTokenDetails = signal<VsmTokenDetail[]>([]);

  // Sample prompt helpers
  setExample(text: string) {
    this.query.set(text);
    this.executeRagTrace();
  }

  async executeRagTrace() {
    const q = this.query().trim();
    if (!q) return;

    this.isSearching.set(true);
    this.errorMessage.set('');
    this.llmResponse.set('');
    this.activeStep.set(1); // Step 1: Tokenization and Embedding

    try {
      const mode = this.settingsService.embeddingMode();
      const k = this.settingsService.topK();
      const threshold = this.settingsService.similarityThreshold();

      // 1. Tokenize query
      const queryTokens = this.embeddingService.tokenize(q);
      this.tokens.set(queryTokens);

      // 2. Generate vector embedding
      const vector = await this.embeddingService.getEmbedding(q);
      this.queryVector.set(vector);

      // Extract VSM word details if local mode
      if (mode === 'local-vsm') {
        const metadata = await (this.embeddingService as any).buildVsmMetadata();
        const wordCounts: { [word: string]: number } = {};
        for (const token of queryTokens) {
          wordCounts[token] = (wordCounts[token] || 0) + 1;
        }

        const details: VsmTokenDetail[] = queryTokens.map(word => {
          const count = wordCounts[word] || 0;
          const tf = count / (queryTokens.length || 1);
          const idf = metadata.idf[word] || 0;
          return {
            word,
            count,
            tf,
            idf,
            tfidf: tf * idf
          };
        });
        // Remove duplicates in visualization list
        const uniqueDetails = details.filter((item, index, self) => 
          self.findIndex(t => t.word === item.word) === index
        );
        this.vsmTokenDetails.set(uniqueDetails);
      } else {
        this.vsmTokenDetails.set([]);
      }

      // Step 2: Cosine Similarity Scan
      this.activeStep.set(2);
      const allChunks = await this.vectorDbService.getChunks();
      const scanned: Array<SearchResult & { passed: boolean }> = [];

      for (const chunk of allChunks) {
        const sim = this.vectorDbService.cosineSimilarity(vector, chunk.embedding);
        scanned.push({
          ...chunk,
          similarity: sim,
          passed: sim >= threshold
        });
      }

      // Sort descending
      scanned.sort((a, b) => b.similarity - a.similarity);
      this.allScannedChunks.set(scanned);

      // Filter and top-K
      const filtered = scanned.filter(c => c.passed).slice(0, k);
      this.topKChunks.set(filtered);

      if (scanned.length === 0) {
        throw new Error('Vector database is empty. Please upload documents in the Knowledge Vault tab first.');
      }

      // Step 3: Prompt Construction
      this.activeStep.set(3);
      const prompt = this.ragService.buildPrompt(q, filtered);
      this.generatedPrompt.set(prompt);

      // Step 4: Generation
      this.activeStep.set(4);
      
      const apiKey = this.settingsService.apiKey();
      if (!apiKey) {
        throw new Error('API Key is required to call the LLM model. Enter your key in settings.');
      }

      await this.ragService.generateResponse(q, (chunkText) => {
        this.llmResponse.update(prev => prev + chunkText);
      });

      this.isSearching.set(false);

    } catch (err) {
      this.errorMessage.set((err as Error).message);
      this.isSearching.set(false);
    }
  }

  // Formatting helper for vector float numbers
  formatVectorSlice(vector: number[]): string {
    if (!vector || vector.length === 0) return '[]';
    const numToShow = 8;
    const slice = vector.slice(0, numToShow);
    const formatted = slice.map(n => n.toFixed(4)).join(', ');
    return `[${formatted}${vector.length > numToShow ? ', ...' : ''}] (${vector.length} dims)`;
  }
}

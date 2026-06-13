import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SettingsService } from '../../../../services/settings.service';
import { VectorDbService, DocumentRecord, ChunkRecord } from '../../../../services/vector-db.service';
import { EmbeddingService } from '../../../../services/embedding.service';
import { 
  LucideAngularModule, 
  UploadCloud, 
  FileText, 
  Trash2, 
  Layers, 
  Sliders,
  CheckCircle,
  Database,
  ArrowRight,
  Loader,
  AlertTriangle,
  X,
  Info
} from 'lucide-angular';
import * as pdfjsLib from 'pdfjs-dist';

// Set PDF.js worker using unpkg CDN matching the installed package version dynamically
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

@Component({
  selector: 'app-vault',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './vault.component.html',
  styleUrl: './vault.component.css'
})
export class VaultComponent implements OnInit {
  readonly settingsService = inject(SettingsService);
  readonly vectorDbService = inject(VectorDbService);
  private readonly embeddingService = inject(EmbeddingService);

  readonly UploadIcon = UploadCloud;
  readonly FileIcon = FileText;
  readonly TrashIcon = Trash2;
  readonly LayersIcon = Layers;
  readonly SlidersIcon = Sliders;
  readonly CheckIcon = CheckCircle;
  readonly DatabaseIcon = Database;
  readonly ArrowRightIcon = ArrowRight;
  readonly LoaderIcon = Loader;
  readonly AlertIcon = AlertTriangle;
  readonly XIcon = X;
  readonly InfoIcon = Info;

  // Component states
  documents = signal<DocumentRecord[]>([]);
  chunks = signal<ChunkRecord[]>([]);
  
  isDragging = signal<boolean>(false);
  isProcessing = signal<boolean>(false);
  processingStatus = signal<string>('');

  notification = signal<{ type: 'success' | 'error' | 'info', message: string } | null>(null);
  private notificationTimer: any = null;
  
  // Interactive chunking visualizer inputs
  previewText = signal<string>('');
  previewFilename = signal<string>('');
  activePreviewTab = signal<'text' | 'chunks'>('text');

  // Note Injector States
  activeUploadTab = signal<'file' | 'note'>('file');
  customNoteTitle = signal<string>('');
  customNoteText = signal<string>('');

  ngOnInit() {
    this.loadDbState();
  }

  async loadDbState() {
    try {
      const docs = await this.vectorDbService.getDocuments();
      const chs = await this.vectorDbService.getChunks();
      this.documents.set(docs);
      this.chunks.set(chs);
    } catch (err) {
      console.error('Error loading DB state:', err);
    }
  }

  showNotification(type: 'success' | 'error' | 'info', message: string) {
    if (this.notificationTimer) {
      clearTimeout(this.notificationTimer);
    }
    this.notification.set({ type, message });
    this.notificationTimer = setTimeout(() => {
      this.clearNotification();
    }, 5000);
  }

  clearNotification() {
    this.notification.set(null);
    if (this.notificationTimer) {
      clearTimeout(this.notificationTimer);
      this.notificationTimer = null;
    }
  }

  // Compute visualization of chunks based on preview text and size parameters
  visualChunks = computed(() => {
    const text = this.previewText();
    if (!text) return [];

    const size = this.settingsService.chunkSize();
    const overlap = this.settingsService.chunkOverlap();

    const chunks: Array<{ text: string; start: number; end: number; overlapStart: number; overlapEnd: number }> = [];
    let start = 0;

    while (start < text.length) {
      let end = start + size;
      if (end > text.length) end = text.length;

      const chunkText = text.slice(start, end);
      
      // Define boundaries for visual highlighting of overlaps
      const overlapStart = start > 0 ? start : -1;
      const overlapEnd = start > 0 ? Math.min(start + overlap, end) : -1;

      chunks.push({
        text: chunkText,
        start,
        end,
        overlapStart,
        overlapEnd
      });

      if (end === text.length) break;

      start = end - overlap;
      if (start >= end) start = end - 1; // Prevent loops
    }

    return chunks;
  });

  previewCustomNote() {
    const title = this.customNoteTitle().trim() || 'injected_note.txt';
    const text = this.customNoteText().trim();
    if (!text) {
      this.showNotification('error', 'Please enter some text content for your note.');
      return;
    }

    const finalTitle = title.match(/\.(txt|md|pdf)$/i) ? title : `${title}.txt`;

    this.previewFilename.set(finalTitle);
    this.previewText.set(text);
    this.activePreviewTab.set('chunks');

    this.customNoteTitle.set('');
    this.customNoteText.set('');
  }

  onDragOver(e: DragEvent) {
    e.preventDefault();
    this.isDragging.set(true);
  }

  onDragLeave() {
    this.isDragging.set(false);
  }

  onDrop(e: DragEvent) {
    e.preventDefault();
    this.isDragging.set(false);
    if (e.dataTransfer?.files?.length) {
      this.handleFile(e.dataTransfer.files[0]);
    }
  }

  onFileSelected(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files?.length) {
      this.handleFile(input.files[0]);
    }
  }

  async handleFile(file: File) {
    const filename = file.name;
    const type = file.name.split('.').pop()?.toLowerCase() || '';

    if (!['txt', 'md', 'pdf'].includes(type)) {
      this.showNotification('error', 'Unsupported file format. Please upload .txt, .md, or .pdf files.');
      return;
    }

    this.isProcessing.set(true);
    this.processingStatus.set('Reading document...');
    this.previewFilename.set(filename);

    try {
      let text = '';
      if (type === 'pdf') {
        text = await this.parsePdf(file);
      } else {
        text = await this.parseText(file);
      }

      this.previewText.set(text);
      this.activePreviewTab.set('chunks');
      this.isProcessing.set(false);
    } catch (err) {
      this.showNotification('error', `Error reading file: ${(err as Error).message}`);
      this.isProcessing.set(false);
    }
  }

  private parseText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  }

  private async parsePdf(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    
    let text = '';
    const numPages = pdf.numPages;

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      this.processingStatus.set(`Extracting page ${pageNum} of ${numPages}...`);
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      text += pageText + '\n\n';
    }

    return text.trim();
  }

  async indexDocument() {
    const text = this.previewText();
    const filename = this.previewFilename();
    if (!text || !filename) return;

    this.isProcessing.set(true);
    this.processingStatus.set('Tokenizing and Chunking text...');

    const size = this.settingsService.chunkSize();
    const overlap = this.settingsService.chunkOverlap();
    const mode = this.settingsService.embeddingMode();
    const provider = this.settingsService.provider();

    try {
      // 1. Generate text slices
      const rawChunks: string[] = [];
      let start = 0;
      while (start < text.length) {
        let end = start + size;
        if (end > text.length) end = text.length;
        rawChunks.push(text.slice(start, end));
        if (end === text.length) break;
        start = end - overlap;
        if (start >= end) start = end - 1;
      }

      const totalChunksCount = rawChunks.length;
      const chunksRecords: ChunkRecord[] = [];

      // Check API Key
      if (mode === 'api' && !this.settingsService.apiKey()) {
        throw new Error(`API key is required for API embeddings. Please open Settings and enter your key.`);
      }

      // 2. Generate Embeddings
      this.processingStatus.set(`Generating embeddings using ${mode === 'local-vsm' ? 'Local TF-IDF' : provider}...`);

      if (mode === 'local-vsm') {
        // Dynamic TF-IDF requires aligning all DB embeddings to the new vocabulary
        const embeddings = await this.embeddingService.alignVsmEmbeddings(rawChunks);
        rawChunks.forEach((chunkText, idx) => {
          chunksRecords.push({
            documentName: filename,
            index: idx + 1,
            text: chunkText,
            embedding: embeddings[idx],
            wordCount: chunkText.split(/\s+/).filter(Boolean).length
          });
        });
      } else {
        // Remote API embeddings (done sequentially or in batches)
        for (let i = 0; i < rawChunks.length; i++) {
          this.processingStatus.set(`Embedding chunk ${i + 1} of ${rawChunks.length}...`);
          const chunkText = rawChunks[i];
          const embedding = await this.embeddingService.getEmbedding(chunkText);
          
          chunksRecords.push({
            documentName: filename,
            index: i + 1,
            text: chunkText,
            embedding: embedding,
            wordCount: chunkText.split(/\s+/).filter(Boolean).length
          });
        }
      }

      // 3. Save to database
      this.processingStatus.set('Saving to local database...');
      const docRecord: DocumentRecord = {
        name: filename,
        size: text.length,
        type: filename.split('.').pop() || 'txt',
        timestamp: Date.now(),
        chunkCount: totalChunksCount
      };

      await this.vectorDbService.addDocument(docRecord, chunksRecords);
      
      // Cleanup preview state and refresh lists
      this.previewText.set('');
      this.previewFilename.set('');
      await this.loadDbState();

      this.isProcessing.set(false);
      this.showNotification('success', 'Document indexed and embeddings stored successfully!');

    } catch (err) {
      this.showNotification('error', `Indexing failed: ${(err as Error).message}`);
      this.isProcessing.set(false);
    }
  }

  async deleteDocument(name: string) {
    if (confirm(`Are you sure you want to delete "${name}" from the database?`)) {
      try {
        await this.vectorDbService.deleteDocument(name);
        // In local TF-IDF mode, deleting a document changes vocabulary.
        // We should trigger a realignment of TF-IDF vectors for remaining chunks.
        if (this.settingsService.embeddingMode() === 'local-vsm') {
          await this.embeddingService.alignVsmEmbeddings([]);
        }
        await this.loadDbState();
      } catch (err) {
        this.showNotification('error', `Deletion failed: ${(err as Error).message}`);
      }
    }
  }

  // Generates a mock visual slice of the embedding array for rendering
  getVectorSparkline(embedding: number[]): { val: number, color: string }[] {
    if (!embedding || embedding.length === 0) return [];
    
    // Take 12 spaced out samples from the vector
    const numSamples = 12;
    const step = Math.max(1, Math.floor(embedding.length / numSamples));
    const samples: number[] = [];
    
    for (let i = 0; i < numSamples; i++) {
      const idx = Math.min(embedding.length - 1, i * step);
      samples.push(embedding[idx] || 0);
    }

    // Find min/max for normalizing
    const maxVal = Math.max(...samples, 0.0001);
    const minVal = Math.min(...samples, -0.0001);
    const range = maxVal - minVal;

    return samples.map(val => {
      // Normalize to 0-1
      const norm = (val - minVal) / range;
      // Map to gradient color (violet scale)
      let color = 'bg-violet-300 dark:bg-violet-700';
      if (norm > 0.8) color = 'bg-violet-600 dark:bg-violet-400';
      else if (norm > 0.6) color = 'bg-violet-500 dark:bg-violet-500';
      else if (norm > 0.4) color = 'bg-violet-400 dark:bg-violet-600';
      else if (norm > 0.2) color = 'bg-violet-300 dark:bg-violet-700';
      else color = 'bg-violet-200 dark:bg-violet-800';

      return {
        val: Math.max(0.1, norm * 100),
        color
      };
    });
  }
}

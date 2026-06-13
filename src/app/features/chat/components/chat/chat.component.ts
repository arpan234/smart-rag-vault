import { Component, ChangeDetectionStrategy, inject, signal, computed, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SettingsService } from '../../../../services/settings.service';
import { RagService } from '../../../../services/rag.service';
import { VectorDbService, SearchResult } from '../../../../services/vector-db.service';
import { Router } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { 
  LucideAngularModule, 
  Send, 
  Sparkles, 
  MessageSquare, 
  Database,
  FileText, 
  ChevronDown, 
  ChevronUp, 
  Info,
  X,
  Plus
} from 'lucide-angular';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: number;
  retrievedChunks?: SearchResult[];
  showSources?: boolean;
}

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.css'
})
export class ChatComponent implements AfterViewChecked {
  readonly settingsService = inject(SettingsService);
  private readonly ragService = inject(RagService);
  private readonly vectorDbService = inject(VectorDbService);
  private readonly router = inject(Router);
  private readonly sanitizer = inject(DomSanitizer);

  @ViewChild('chatScrollContainer') private chatScrollContainer!: ElementRef;

  readonly SendIcon = Send;
  readonly SparklesIcon = Sparkles;
  readonly MessageIcon = MessageSquare;
  readonly DatabaseIcon = Database;
  readonly FileIcon = FileText;
  readonly ChevronDownIcon = ChevronDown;
  readonly ChevronUpIcon = ChevronUp;
  readonly InfoIcon = Info;
  readonly XIcon = X;
  readonly PlusIcon = Plus;

  // Chat message list signal
  messages = signal<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: "Hello! I am your Smart RAG Assistant. Ask me any questions based on your uploaded documents, and I'll find the answers using local vector retrieval search.",
      timestamp: Date.now()
    }
  ]);

  // Input model
  userInput = signal<string>('');
  
  // Loading status
  isGenerating = signal<boolean>(false);

  // Citation details modal
  selectedChunk = signal<SearchResult | null>(null);

  // DB Document count for empty state warning
  hasDocuments = signal<boolean>(true);

  constructor() {
    this.checkDbState();
  }

  async checkDbState() {
    try {
      const docs = await this.vectorDbService.getDocuments();
      this.hasDocuments.set(docs.length > 0);
    } catch (e) {
      this.hasDocuments.set(false);
    }
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  private scrollToBottom(): void {
    try {
      if (this.chatScrollContainer?.nativeElement) {
        this.chatScrollContainer.nativeElement.scrollTop = this.chatScrollContainer.nativeElement.scrollHeight;
      }
    } catch (err) { }
  }

  navigateToVault() {
    this.router.navigate(['/vault']);
  }

  toggleSources(messageId: string) {
    this.messages.update(msgs => msgs.map(m => {
      if (m.id === messageId) {
        return { ...m, showSources: !m.showSources };
      }
      return m;
    }));
  }

  async sendMessage() {
    const query = this.userInput().trim();
    if (!query || this.isGenerating()) return;

    // Clear input
    this.userInput.set('');

    const userMessageId = Math.random().toString(36).substring(7);
    const assistantMessageId = Math.random().toString(36).substring(7);

    // 1. Add user message
    this.messages.update(prev => [...prev, {
      id: userMessageId,
      sender: 'user',
      text: query,
      timestamp: Date.now()
    }]);

    // 2. Add empty assistant message for streaming
    this.messages.update(prev => [...prev, {
      id: assistantMessageId,
      sender: 'assistant',
      text: '',
      timestamp: Date.now(),
      showSources: false
    }]);

    this.isGenerating.set(true);

    try {
      // 3. Trigger RAG response
      const result = await this.ragService.generateResponse(query, (chunkText) => {
        // Stream text chunk update
        this.messages.update(msgs => msgs.map(m => {
          if (m.id === assistantMessageId) {
            return { ...m, text: m.text + chunkText };
          }
          return m;
        }));
      });

      // 4. Update message with final response and matched citations
      this.messages.update(msgs => msgs.map(m => {
        if (m.id === assistantMessageId) {
          return {
            ...m,
            text: result.response,
            retrievedChunks: result.retrievedChunks
          };
        }
        return m;
      }));

    } catch (err) {
      // Print error
      this.messages.update(msgs => msgs.map(m => {
        if (m.id === assistantMessageId) {
          return {
            ...m,
            text: `⚠️ **Generation Error**: ${(err as Error).message}\n\nPlease check your API Key and RAG settings.`
          };
        }
        return m;
      }));
    } finally {
      this.isGenerating.set(false);
      this.checkDbState(); // Recheck if documents exist
    }
  }

  openChunkDetail(chunk: SearchResult) {
    this.selectedChunk.set(chunk);
  }

  closeChunkDetail() {
    this.selectedChunk.set(null);
  }

  /**
   * Premium Markdown Formatter
   * Parses standard markdown (headings, bold, italics, code blocks, ordered/unordered lists) into clean, premium HTML.
   * Merges single newlines into a space (standard Markdown behavior) to prevent spread text.
   */
  formatMessageText(text: string): SafeHtml {
    if (!text) return '';

    // 1. Escape HTML to prevent injection
    let html = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // 2. Extract code blocks to protect them during paragraph splitting
    const codeBlocks: string[] = [];
    html = html.replace(/```([\s\S]+?)```/g, (match, code) => {
      const id = `__CODE_BLOCK_${codeBlocks.length}__`;
      codeBlocks.push(
        `<pre class="bg-zinc-50 dark:bg-zinc-900/60 p-4 rounded-xl overflow-x-auto text-xs my-3 font-mono text-zinc-800 dark:text-zinc-200 border border-zinc-200/50 dark:border-zinc-800/50 shadow-inner"><code>${code.trim()}</code></pre>`
      );
      return id;
    });

    // 3. Split into blocks by double-newlines
    const rawBlocks = html.split(/\n\s*\n/);
    const parsedBlocks: string[] = [];

    for (const block of rawBlocks) {
      const trimmedBlock = block.trim();
      if (!trimmedBlock) continue;

      // Restore code block placeholder directly
      if (trimmedBlock.startsWith('__CODE_BLOCK_') && trimmedBlock.endsWith('__')) {
        parsedBlocks.push(trimmedBlock);
        continue;
      }

      // Headings
      if (trimmedBlock.startsWith('### ')) {
        parsedBlocks.push(`<h3 class="text-sm font-bold text-zinc-950 dark:text-zinc-50 mt-5 mb-2">${trimmedBlock.substring(4)}</h3>`);
        continue;
      }
      if (trimmedBlock.startsWith('## ')) {
        parsedBlocks.push(`<h2 class="text-base font-bold text-zinc-950 dark:text-zinc-50 mt-6 mb-3">${trimmedBlock.substring(3)}</h2>`);
        continue;
      }
      if (trimmedBlock.startsWith('# ')) {
        parsedBlocks.push(`<h1 class="text-lg font-bold text-zinc-950 dark:text-zinc-50 mt-8 mb-4">${trimmedBlock.substring(2)}</h1>`);
        continue;
      }

      // Horizontal Rule
      if (trimmedBlock === '---') {
        parsedBlocks.push('<hr class="my-5 border-zinc-200/50 dark:border-zinc-800/50" />');
        continue;
      }

      // List parsing (runs line by line inside list block)
      const lines = trimmedBlock.split('\n');
      const firstLine = lines[0].trim();
      const isOl = /^\d+\.\s+/.test(firstLine);
      const isUl = /^[\*\-]\s+/.test(firstLine);

      if (isOl || isUl) {
        let listHtml = isOl 
          ? `<ol class="list-decimal pl-5 my-3.5 space-y-1.5 text-zinc-700 dark:text-zinc-300">` 
          : `<ul class="list-disc pl-5 my-3.5 space-y-1.5 text-zinc-700 dark:text-zinc-300">`;
        
        for (const line of lines) {
          const trimmedLine = line.trim();
          if (isOl) {
            const match = trimmedLine.match(/^\d+\.\s+(.*)$/);
            if (match) {
              listHtml += `<li class="pl-1 leading-relaxed">${match[1]}</li>`;
            } else {
              // Wrap continuation line into the previous list item
              listHtml = listHtml.replace(/<\/li>$/, ` ${trimmedLine}</li>`);
            }
          } else {
            const match = trimmedLine.match(/^[\*\-]\s+(.*)$/);
            if (match) {
              listHtml += `<li class="pl-1 leading-relaxed">${match[1]}</li>`;
            } else {
              listHtml = listHtml.replace(/<\/li>$/, ` ${trimmedLine}</li>`);
            }
          }
        }
        listHtml += isOl ? '</ol>' : '</ul>';
        parsedBlocks.push(listHtml);
        continue;
      }

      // Paragraph Block: Merge single newlines into a space (standard Markdown behavior)
      // This solves the disjointed/spread text layout issue.
      const mergedText = lines.map(l => l.trim()).join(' ');
      parsedBlocks.push(`<p class="leading-relaxed mb-3 text-zinc-700 dark:text-zinc-300">${mergedText}</p>`);
    }

    // Combine blocks back
    let finalHtml = parsedBlocks.join('\n');

    // Restore code blocks
    codeBlocks.forEach((codeHtml, idx) => {
      finalHtml = finalHtml.replace(`__CODE_BLOCK_${idx}__`, codeHtml);
    });

    // 4. Parse bold text: **text**
    finalHtml = finalHtml.replace(/\*\*([^\*]+)\*\*/g, '<strong class="font-semibold text-zinc-950 dark:text-zinc-50">$1</strong>');

    // 5. Parse italic text: *text*
    finalHtml = finalHtml.replace(/\*([^\*]+)\*/g, '<em class="italic text-zinc-700 dark:text-zinc-300">$1</em>');

    // 6. Parse inline code: `code`
    finalHtml = finalHtml.replace(/`([^`]+)`/g, '<code class="bg-zinc-100 dark:bg-zinc-900/60 px-1.5 py-0.5 rounded text-xs font-mono text-violet-600 dark:text-violet-400 border border-zinc-200/30 dark:border-zinc-800/30">$1</code>');

    // 7. Parse file brackets citations: [filename.pdf (Chunk X)] -> Superscript index badge
    finalHtml = finalHtml.replace(/\[([^\]]+?\.(?:pdf|txt|md)(?:\s+\(Chunk\s+\d+\))?)\]/gi, (match, citation) => {
      const chunkMatch = citation.match(/\(Chunk\s+(\d+)\)/i);
      const label = chunkMatch ? `${chunkMatch[1]}` : 'doc';
      return `<span class="inline-flex items-center text-[9px] font-extrabold text-violet-600 dark:text-violet-400 bg-violet-500/10 hover:bg-violet-500/20 px-1.2 py-0.2 rounded ml-1 cursor-pointer select-none align-super transition-all" title="Source: ${citation}">[${label}]</span>`;
    });

    return this.sanitizer.bypassSecurityTrustHtml(finalHtml);
  }
}

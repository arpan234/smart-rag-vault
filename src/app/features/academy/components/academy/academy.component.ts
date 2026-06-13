import { Component, ChangeDetectionStrategy, inject, signal, computed, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SettingsService } from '../../../../services/settings.service';
import { 
  LucideAngularModule, 
  Sparkles, 
  Cpu, 
  Database, 
  GraduationCap, 
  ArrowRight,
  TrendingUp,
  Info,
  HelpCircle,
  Play,
  RotateCcw,
  CheckCircle,
  AlertTriangle,
  Move,
  Pause,
  SkipForward,
  SkipBack,
  Terminal,
  Binary,
  FileText,
  Send,
  Search,
  User,
  BookOpen,
  ShieldCheck,
  Layers,
  Settings
} from 'lucide-angular';

export interface WordNode {
  word: string;
  x: number; // 0 to 100 (grid coordinate space)
  y: number; // 0 to 100 (grid coordinate space)
  category: 'animals' | 'space' | 'food';
}

@Component({
  selector: 'app-academy',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './academy.component.html',
  styleUrl: './academy.component.css'
})
export class AcademyComponent implements OnDestroy {
  readonly settingsService = inject(SettingsService);

  // Icons
  readonly SparklesIcon = Sparkles;
  readonly CpuIcon = Cpu;
  readonly DatabaseIcon = Database;
  readonly AcademyIcon = GraduationCap;
  readonly ArrowRightIcon = ArrowRight;
  readonly TrendingUpIcon = TrendingUp;
  readonly InfoIcon = Info;
  readonly HelpIcon = HelpCircle;
  readonly PlayIcon = Play;
  readonly ResetIcon = RotateCcw;
  readonly CheckIcon = CheckCircle;
  readonly AlertIcon = AlertTriangle;
  readonly MoveIcon = Move;
  readonly PauseIcon = Pause;
  readonly SkipForwardIcon = SkipForward;
  readonly SkipBackIcon = SkipBack;
  readonly TerminalIcon = Terminal;
  readonly BinaryIcon = Binary;
  readonly FileTextIcon = FileText;
  readonly SendIcon = Send;
  readonly SearchIcon = Search;
  readonly UserIcon = User;
  readonly BookOpenIcon = BookOpen;
  readonly ShieldCheckIcon = ShieldCheck;
  readonly LayersIcon = Layers;
  readonly SettingsIcon = Settings;

  // Level selector
  readonly activeLevel = signal<'intro' | 'beginner' | 'intermediate' | 'expert'>('intro');

  // ================= RAG ANIMATION SIMULATOR STATE =================
  readonly animStep = signal<number>(1);
  readonly animPlaying = signal<boolean>(false);
  readonly animQuery = signal<string>("What are the ingredients in Chef Leo's secret soup?");
  readonly animSearchInput = signal<string>("What are the ingredients in Chef Leo's secret soup?");
  
  readonly animVector = computed(() => {
    const q = this.animQuery();
    const vec: string[] = [];
    let hash = 0;
    for (let i = 0; i < q.length; i++) {
      hash = q.charCodeAt(i) + ((hash << 5) - hash);
    }
    for (let i = 0; i < 6; i++) {
      const val = Math.abs(((hash >> (i * 4)) & 0xff) / 255);
      const sign = (i % 2 === 0) ? '' : '-';
      vec.push(`${sign}${val.toFixed(3)}`);
    }
    return `[${vec.join(', ')}, ...]`;
  });

  readonly animRetrievedChunk = computed(() => {
    const q = this.animQuery().toLowerCase();
    if (q.includes('soup') || q.includes('leo') || q.includes('ingredients')) {
      return {
        title: "chef_menu.txt (Chunk #1)",
        content: "Chef Leo's secret strawberry soup consists of fresh strawberries, organic honey, and double-cracked black pepper.",
        score: "0.941"
      };
    } else if (q.includes('mascot') || q.includes('hamster') || q.includes('byte')) {
      return {
        title: "mascot_info.md (Chunk #1)",
        content: "Our company mascot is a blue robotic hamster named Byte who loves sleeping on warm motherboards.",
        score: "0.912"
      };
    } else if (q.includes('passkey') || q.includes('server') || q.includes('glowmesh')) {
      return {
        title: "server_secrets.env (Chunk #3)",
        content: "The network server backup passkey is 'GlowMesh2026' and expires in October.",
        score: "0.898"
      };
    } else {
      return {
        title: "general_docs.txt (Chunk #45)",
        content: "Smart RAG Vault is separated into three specialized functional screens designed for educational experimentation.",
        score: "0.412"
      };
    }
  });

  readonly animFinalResponse = computed(() => {
    const q = this.animQuery().toLowerCase();
    if (q.includes('soup') || q.includes('leo') || q.includes('ingredients')) {
      return "Chef Leo's secret strawberry soup is made of fresh strawberries, organic honey, and black pepper.";
    } else if (q.includes('mascot') || q.includes('hamster') || q.includes('byte')) {
      return "The company mascot is a blue robotic hamster named Byte who loves sleeping on warm motherboards.";
    } else if (q.includes('passkey') || q.includes('server') || q.includes('glowmesh')) {
      return "The server backup passkey is 'GlowMesh2026' and is scheduled to expire in October.";
    } else {
      return "Smart RAG Vault is an educational workspace app for studying RAG and vector calculations client-side.";
    }
  });

  animTimer: any = null;

  startAnim() {
    if (this.animPlaying()) return;
    this.animPlaying.set(true);
    
    if (this.animStep() === 6) {
      this.animStep.set(1);
    }

    this.runAnimLoop();
  }

  pauseAnim() {
    this.animPlaying.set(false);
    if (this.animTimer) {
      clearTimeout(this.animTimer);
      this.animTimer = null;
    }
  }

  resetAnim() {
    this.pauseAnim();
    this.animStep.set(1);
  }

  stepAnim(direction: 'next' | 'prev') {
    this.pauseAnim();
    if (direction === 'next') {
      const nextStep = this.animStep() < 6 ? this.animStep() + 1 : 1;
      this.animStep.set(nextStep);
    } else {
      const prevStep = this.animStep() > 1 ? this.animStep() - 1 : 6;
      this.animStep.set(prevStep);
    }
  }

  private runAnimLoop() {
    if (!this.animPlaying()) return;

    this.animTimer = setTimeout(() => {
      const current = this.animStep();
      if (current < 6) {
        this.animStep.set(current + 1);
        this.runAnimLoop();
      } else {
        this.animPlaying.set(false);
      }
    }, 3200); // 3.2s per step for clear readability
  }

  selectAnimQuery(query: string) {
    this.animQuery.set(query);
    this.animSearchInput.set(query);
    this.resetAnim();
  }

  submitAnimSearch() {
    const query = this.animSearchInput().trim();
    if (query) {
      this.animQuery.set(query);
      this.resetAnim();
      this.startAnim();
    }
  }

  ngOnDestroy() {
    if (this.animTimer) {
      clearTimeout(this.animTimer);
    }
  }

  // ================= LEVEL 0: INTRO / PRIMER STATE =================
  readonly analogyMode = signal<'closed' | 'open'>('closed');
  readonly selectedCaseStudy = signal<'support' | 'legal' | 'medical' | 'finance'>('support');

  readonly caseStudies = {
    support: {
      title: 'Customer Support Automation',
      problem: 'Generic LLMs do not know your shipping guidelines, return windows, or product assembly guides, causing them to hallucinate support answers.',
      ragSolution: 'RAG retrieves the exact paragraph from the product manual PDF and appends it to the prompt. The AI answers with 100% precision.',
      citation: 'Source: shipping_faq.txt (Chunk #4)'
    },
    legal: {
      title: 'Legal Document Discovery',
      problem: 'Lawyers need to query thousands of pages of court filings. Copy-pasting all text into the LLM exceeds the token budget and is extremely expensive.',
      ragSolution: 'The database searches millions of sentences in milliseconds, extracts only the 3 most relevant precedent cases, and feeds only those to the LLM.',
      citation: 'Source: supreme_court_ruling_2024.pdf (Chunk #81)'
    },
    medical: {
      title: 'Clinical Support Assistant',
      problem: 'Doctors require up-to-the-minute clinical drug guidelines. Relying on model training memory risks prescribing outdated dosages.',
      ragSolution: 'The medical vault is queried for the latest official drug interaction PDFs, injecting the exact verified dosage into the doctor\'s query.',
      citation: 'Source: fda_guidelines_v12.pdf (Chunk #112)'
    },
    finance: {
      title: 'Quarterly Earnings Analyst',
      problem: 'Investment analysts need to compare this morning\'s financial reports against historic data, which was published after the model\'s training cutoff date.',
      ragSolution: 'RAG indexes the freshly generated PDF report, allowing immediate querying of brand new numbers alongside past earnings vectors.',
      citation: 'Source: q3_earnings_report.pdf (Chunk #18)'
    }
  };

  // ================= LEVEL 1: BEGINNER (VECTOR PLOTTER) =================
  readonly wordNodes: WordNode[] = [
    // Animals
    { word: 'puppy', x: 20, y: 30, category: 'animals' },
    { word: 'dog', x: 23, y: 26, category: 'animals' },
    { word: 'kitten', x: 14, y: 35, category: 'animals' },
    { word: 'cat', x: 17, y: 32, category: 'animals' },
    // Space
    { word: 'planet', x: 80, y: 75, category: 'space' },
    { word: 'stars', x: 85, y: 80, category: 'space' },
    { word: 'galaxy', x: 78, y: 83, category: 'space' },
    { word: 'rocket', x: 71, y: 68, category: 'space' },
    // Food
    { word: 'apple', x: 50, y: 15, category: 'food' },
    { word: 'banana', x: 55, y: 18, category: 'food' },
    { word: 'pizza', x: 45, y: 22, category: 'food' },
    { word: 'burger', x: 48, y: 25, category: 'food' }
  ];

  readonly queryPoint = signal<{ x: number; y: number }>({ x: 50, y: 50 });
  isDragging = false;

  readonly closestWords = computed(() => {
    const q = this.queryPoint();
    return this.wordNodes
      .map(node => {
        const dx = node.x - q.x;
        const dy = node.y - q.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        // Map distance to a similarity percentage (near 0 distance is 100%, far is 0%)
        const similarity = Math.max(0, 100 - (distance * 1.6));
        return { ...node, distance, similarity };
      })
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 4);
  });

  setLevel(level: 'intro' | 'beginner' | 'intermediate' | 'expert') {
    this.activeLevel.set(level);
  }

  // Handle click or drag on the 2D grid
  handleGridInteract(event: MouseEvent, svgContainer: any) {
    const rect = svgContainer.getBoundingClientRect();
    const clientX = event.clientX - rect.left;
    const clientY = event.clientY - rect.top;
    
    // Convert to 0-100 percentage values
    const px = Math.min(100, Math.max(0, (clientX / rect.width) * 100));
    const py = Math.min(100, Math.max(0, (clientY / rect.height) * 100));
    
    this.queryPoint.set({ 
      x: Math.round(px), 
      y: Math.round(py) 
    });
  }

  onMouseDown(event: MouseEvent, svgContainer: any) {
    this.isDragging = true;
    this.handleGridInteract(event, svgContainer);
  }

  onMouseMove(event: MouseEvent, svgContainer: any) {
    if (this.isDragging) {
      this.handleGridInteract(event, svgContainer);
    }
  }

  onMouseUpOrLeave() {
    this.isDragging = false;
  }

  // ================= LEVEL 2: INTERMEDIATE (COSINE CALCULATOR) =================
  sentenceA = signal<string>('Artificial intelligence algorithms analyze database vectors');
  sentenceB = signal<string>('AI algorithms process vector data');

  readonly vectorAnalysis = computed(() => {
    const sA = this.sentenceA().trim().toLowerCase();
    const sB = this.sentenceB().trim().toLowerCase();

    // Simple word tokenization (remove punctuation)
    const wordsA = sA.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '').split(/\s+/).filter(Boolean);
    const wordsB = sB.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '').split(/\s+/).filter(Boolean);

    // Build unique vocabulary
    const vocab = Array.from(new Set([...wordsA, ...wordsB])).sort();

    if (vocab.length === 0) {
      return {
        vocab: [],
        vectorA: [],
        vectorB: [],
        dotProduct: 0,
        magnitudeA: 0,
        magnitudeB: 0,
        similarity: 0,
        angleDegrees: 90
      };
    }

    // Freq vectors
    const vecA = vocab.map(w => wordsA.filter(x => x === w).length);
    const vecB = vocab.map(w => wordsB.filter(x => x === w).length);

    // Dot product
    let dotProduct = 0;
    for (let i = 0; i < vocab.length; i++) {
      dotProduct += vecA[i] * vecB[i];
    }

    // Magnitudes
    const magA = Math.sqrt(vecA.reduce((sum, val) => sum + val * val, 0));
    const magB = Math.sqrt(vecB.reduce((sum, val) => sum + val * val, 0));

    // Cosine similarity
    const similarity = (magA > 0 && magB > 0) ? (dotProduct / (magA * magB)) : 0;

    // Angle: cos(theta) = similarity. theta = acos(similarity)
    const angleRad = Math.acos(Math.min(1, Math.max(-1, similarity)));
    const angleDegrees = (angleRad * 180) / Math.PI;

    return {
      vocab,
      vectorA: vecA,
      vectorB: vecB,
      dotProduct,
      magnitudeA: Number(magA.toFixed(3)),
      magnitudeB: Number(magB.toFixed(3)),
      similarity: Number(similarity.toFixed(3)),
      angleDegrees: Number(angleDegrees.toFixed(1))
    };
  });

  resetSentences() {
    this.sentenceA.set('Artificial intelligence algorithms analyze database vectors');
    this.sentenceB.set('AI algorithms process vector data');
  }

  setSampleSentences(type: 'matching' | 'different' | 'partial') {
    if (type === 'matching') {
      this.sentenceA.set('Machine learning models extract document knowledge');
      this.sentenceB.set('Machine learning models extract document knowledge');
    } else if (type === 'different') {
      this.sentenceA.set('Our company mascot is a blue robotic hamster');
      this.sentenceB.set('Chef Leo cooks fresh strawberry soup');
    } else {
      this.sentenceA.set('Search queries represent high dimensional coordinate points');
      this.sentenceB.set('Embedding algorithms map queries onto coordinates');
    }
  }

  // ================= LEVEL 3: EXPERT (RAG SIMULATOR) =================
  readonly expertFacts = [
    { id: 1, text: "Chef Leo's secret strawberry soup consists of fresh strawberries, organic honey, and double-cracked black pepper.", topic: "soup" },
    { id: 2, text: "The network server backup passkey is 'GlowMesh2026' and expires in October.", topic: "passkey" },
    { id: 3, text: "Our company mascot is a blue robotic hamster named Byte who loves sleeping on warm motherboards.", topic: "mascot" }
  ];

  readonly samplePrompts = [
    "What is the secret server backup passkey?",
    "What are the ingredients in Chef Leos soup?",
    "Tell me about the company mascot",
    "Where is the company headquarters located?"
  ];

  expertPrompt = signal<string>('What are the ingredients in Chef Leos soup?');
  ragEnabled = signal<boolean>(true);
  noiseEnabled = signal<boolean>(false);
  topK = signal<number>(1);

  simulatedResponse = signal<string>('');
  isSimulating = signal<boolean>(false);

  readonly compiledPrompt = computed(() => {
    const query = this.expertPrompt().trim();
    const isRAG = this.ragEnabled();
    const isNoise = this.noiseEnabled();
    const k = this.topK();

    if (!query) return 'Type a question or select a template above...';

    let contextStr = '';
    if (isRAG) {
      const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
      
      let scoredFacts = this.expertFacts.map(fact => {
        let score = 0;
        queryWords.forEach(word => {
          // simple keyword matching simulation
          if (fact.text.toLowerCase().includes(word)) {
            score += 2;
          }
        });
        
        // If noise is enabled, rank IRRELEVANT facts higher
        if (isNoise) {
          score = (score === 0) ? 5 : 0;
        }

        return { fact, score };
      });

      // Sort by score
      scoredFacts.sort((a, b) => b.score - a.score);
      const retrieved = scoredFacts.slice(0, k).filter(x => isNoise || x.score > 0).map(x => x.fact.text);
      contextStr = retrieved.join('\n\n');
    }

    let systemInstructions = "You are a helpful assistant. ";
    if (isRAG) {
      systemInstructions += "Answer the question ONLY based on the context provided. If the context does not contain the answer, say 'I cannot find the answer in the provided context'. Do not hallucinate.";
    } else {
      systemInstructions += "Answer the question based on your general pre-trained knowledge. If you do not know, make a reasonable guess.";
    }

    return `[SYSTEM INSTRUCTIONS]
${systemInstructions}

${isRAG ? `[RETRIEVED CONTEXT DATABASE]
${contextStr || '(No matching context chunks retrieved)'}` : ''}

[USER QUESTION]
${query}`;
  });

  async runSimulation() {
    if (this.isSimulating()) return;
    this.isSimulating.set(true);
    this.simulatedResponse.set('');

    const query = this.expertPrompt().trim().toLowerCase();
    const isRAG = this.ragEnabled();
    const isNoise = this.noiseEnabled();

    let targetAnswer = '';

    if (isRAG) {
      if (isNoise) {
        targetAnswer = "⚠️ RAG Retrieval Failure (Noise Injected):\n\nI cannot find the answer to your question in the provided context. The context retrieved contains information about Byte the mascot or server codes, but nothing about the requested query. I am instructed not to hallucinate.";
      } else if (query.includes('soup') || query.includes('leo') || query.includes('strawberry')) {
        targetAnswer = "✅ RAG Synthesis Success:\n\nBased on the retrieved context, Chef Leo's secret strawberry soup consists of: \n1. Fresh strawberries\n2. Organic honey\n3. Double-cracked black pepper\n\nThis answer is 100% verified by the retrieved database chunk.";
      } else if (query.includes('passkey') || query.includes('server') || query.includes('glowmesh')) {
        targetAnswer = "✅ RAG Synthesis Success:\n\nAccording to the retrieved records, the server backup passkey is 'GlowMesh2026'. Please note that this key will expire in October.";
      } else if (query.includes('mascot') || query.includes('hamster') || query.includes('byte')) {
        targetAnswer = "✅ RAG Synthesis Success:\n\nBased on the retrieved context, the company mascot is a blue robotic hamster named Byte. Byte's favorite activity is sleeping on warm motherboards.";
      } else {
        targetAnswer = "⚠️ RAG Retrieval Failure:\n\nI cannot find the answer to your question in the retrieved context chunks. Since RAG is active and no matching context was found, I must reject answering to prevent hallucination.";
      }
    } else {
      // RAG OFF -> HALLUCINATE OR FAIL
      if (query.includes('soup') || query.includes('leo') || query.includes('strawberry')) {
        targetAnswer = "❌ LLM Hallucination (RAG Disabled):\n\nChef Leo's famous strawberry soup is a chilled dessert soup made of pureed strawberries, Greek yogurt, fresh mint leaves, lemon juice, and a splash of white balsamic vinegar, served cold with whipped cream. \n\n(Notice: The LLM made this up! The real secret ingredient was black pepper, which the model had no way of knowing without RAG context.)";
      } else if (query.includes('passkey') || query.includes('server') || query.includes('glowmesh')) {
        targetAnswer = "❌ LLM Refusal (RAG Disabled):\n\nAs an AI, I do not have access to your private local network server codes or passkeys. Please check your internal system documentation or contact your DevOps team.";
      } else if (query.includes('mascot') || query.includes('hamster') || query.includes('byte')) {
        targetAnswer = "❌ LLM Guess (RAG Disabled):\n\nMost tech companies have mascots like squirrels, dogs, or crabs (like Ferris for Rust). Without internal documentation, I would assume your company mascot is a standard cute animal like a cartoon cat or a raccoon.";
      } else {
        targetAnswer = "❌ LLM General Knowledge Response:\n\nI don't have access to your private database files. I can only guess based on public training data, which does not contain your specific company sandbox information.";
      }
    }

    // Stream the answer character by character
    let index = 0;
    const interval = setInterval(() => {
      if (index < targetAnswer.length) {
        this.simulatedResponse.update(prev => prev + targetAnswer.charAt(index));
        index++;
      } else {
        clearInterval(interval);
        this.isSimulating.set(false);
      }
    }, 15);
  }

  selectSamplePrompt(prompt: string) {
    this.expertPrompt.set(prompt);
    this.simulatedResponse.set('');
  }
}

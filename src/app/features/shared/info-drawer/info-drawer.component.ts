import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SettingsService } from '../../../services/settings.service';
import { 
  LucideAngularModule, 
  X, 
  BookOpen, 
  Cpu, 
  Database, 
  Sparkles, 
  Info, 
  Lock, 
  Scale, 
  ArrowRight,
  FileText,
  HelpCircle,
  Code
} from 'lucide-angular';

export type InfoTab = 'pipeline' | 'math' | 'guide';

@Component({
  selector: 'app-info-drawer',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './info-drawer.component.html',
  styleUrl: './info-drawer.component.css'
})
export class InfoDrawerComponent {
  readonly settingsService = inject(SettingsService);

  // Icons
  readonly XIcon = X;
  readonly BookIcon = BookOpen;
  readonly CpuIcon = Cpu;
  readonly DatabaseIcon = Database;
  readonly SparklesIcon = Sparkles;
  readonly InfoIcon = Info;
  readonly LockIcon = Lock;
  readonly ScaleIcon = Scale;
  readonly ArrowRightIcon = ArrowRight;
  readonly FileIcon = FileText;
  readonly HelpIcon = HelpCircle;
  readonly CodeIcon = Code;

  // Active Educational Tab signal
  readonly activeTab = signal<InfoTab>('pipeline');

  // Math equations and terms explanation signals
  readonly expandedMathTerm = signal<string | null>(null);

  setTab(tab: InfoTab) {
    this.activeTab.set(tab);
  }

  toggleMathTerm(term: string) {
    this.expandedMathTerm.update(current => current === term ? null : term);
  }
}

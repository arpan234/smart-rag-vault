import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SettingsService, Provider, EmbeddingMode } from '../../../services/settings.service';
import { VectorDbService } from '../../../services/vector-db.service';
import { 
  LucideAngularModule, 
  X, 
  Eye, 
  EyeOff, 
  Settings, 
  Trash2, 
  Database,
  Check
} from 'lucide-angular';

@Component({
  selector: 'app-settings-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './settings-modal.component.html',
  styleUrl: './settings-modal.component.css'
})
export class SettingsModalComponent {
  readonly settingsService = inject(SettingsService);
  private readonly vectorDbService = inject(VectorDbService);

  readonly XIcon = X;
  readonly EyeIcon = Eye;
  readonly EyeOffIcon = EyeOff;
  readonly SettingsIcon = Settings;
  readonly TrashIcon = Trash2;
  readonly DatabaseIcon = Database;
  readonly CheckIcon = Check;

  showKey = signal<boolean>(false);
  resetSuccess = signal<boolean>(false);

  toggleShowKey() {
    this.showKey.update(v => !v);
  }

  async handleResetDatabase() {
    if (confirm('Are you sure you want to clear the entire vector database? This will delete all documents and chunk embeddings.')) {
      try {
        await this.vectorDbService.resetDatabase();
        this.resetSuccess.set(true);
        setTimeout(() => this.resetSuccess.set(false), 3000);
      } catch (err) {
        alert(`Reset failed: ${(err as Error).message}`);
      }
    }
  }
}

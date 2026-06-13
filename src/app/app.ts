import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SettingsService } from './services/settings.service';
import { SeoService } from './services/seo.service';
import { SettingsModalComponent } from './features/shared/settings-modal/settings-modal.component';
import { InfoDrawerComponent } from './features/shared/info-drawer/info-drawer.component';
import { 
  LucideAngularModule, 
  MessageSquare, 
  Database, 
  Cpu, 
  Settings, 
  Sun, 
  Moon,
  HelpCircle,
  GraduationCap
} from 'lucide-angular';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule, 
    RouterOutlet, 
    RouterLink, 
    RouterLinkActive, 
    SettingsModalComponent, 
    InfoDrawerComponent,
    LucideAngularModule
  ],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  readonly settingsService = inject(SettingsService);
  private readonly seoService = inject(SeoService);

  readonly ChatIcon = MessageSquare;
  readonly DatabaseIcon = Database;
  readonly CpuIcon = Cpu;
  readonly SettingsIcon = Settings;
  readonly SunIcon = Sun;
  readonly MoonIcon = Moon;
  readonly HelpIcon = HelpCircle;
  readonly AcademyIcon = GraduationCap;

  ngOnInit() {
    this.seoService.init();
  }
}


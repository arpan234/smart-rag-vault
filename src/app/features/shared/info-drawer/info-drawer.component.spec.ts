import { TestBed } from '@angular/core/testing';
import { InfoDrawerComponent } from './info-drawer.component';
import { SettingsService } from '../../../services/settings.service';
import { describe, it, expect, beforeEach } from 'vitest';

describe('InfoDrawerComponent', () => {
  let settingsService: SettingsService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InfoDrawerComponent],
      providers: [SettingsService]
    }).compileComponents();

    settingsService = TestBed.inject(SettingsService);
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(InfoDrawerComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('should set active tab correctly', () => {
    const fixture = TestBed.createComponent(InfoDrawerComponent);
    const component = fixture.componentInstance;
    
    // Default tab should be 'pipeline'
    expect(component.activeTab()).toBe('pipeline');

    // Set to 'math'
    component.setTab('math');
    expect(component.activeTab()).toBe('math');

    // Set to 'guide'
    component.setTab('guide');
    expect(component.activeTab()).toBe('guide');
  });

  it('should toggle math term descriptions', () => {
    const fixture = TestBed.createComponent(InfoDrawerComponent);
    const component = fixture.componentInstance;

    // Default expanded term is null
    expect(component.expandedMathTerm()).toBeNull();

    // Expand 'tfidf'
    component.toggleMathTerm('tfidf');
    expect(component.expandedMathTerm()).toBe('tfidf');

    // Collapse 'tfidf'
    component.toggleMathTerm('tfidf');
    expect(component.expandedMathTerm()).toBeNull();
  });
});

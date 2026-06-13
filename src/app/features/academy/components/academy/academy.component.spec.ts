import { TestBed } from '@angular/core/testing';
import { AcademyComponent } from './academy.component';
import { SettingsService } from '../../../../services/settings.service';
import { describe, it, expect, beforeEach } from 'vitest';

describe('AcademyComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AcademyComponent],
      providers: [SettingsService]
    }).compileComponents();
  });

  it('should create the academy component', () => {
    const fixture = TestBed.createComponent(AcademyComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('should switch active levels correctly', () => {
    const fixture = TestBed.createComponent(AcademyComponent);
    const component = fixture.componentInstance;

    expect(component.activeLevel()).toBe('intro');

    component.setLevel('beginner');
    expect(component.activeLevel()).toBe('beginner');

    component.setLevel('intermediate');
    expect(component.activeLevel()).toBe('intermediate');

    component.setLevel('expert');
    expect(component.activeLevel()).toBe('expert');
  });

  it('should toggle analogy mode and select case studies', () => {
    const fixture = TestBed.createComponent(AcademyComponent);
    const component = fixture.componentInstance;

    // Default analogy mode is 'closed'
    expect(component.analogyMode()).toBe('closed');
    component.analogyMode.set('open');
    expect(component.analogyMode()).toBe('open');

    // Default case study is 'support'
    expect(component.selectedCaseStudy()).toBe('support');
    component.selectedCaseStudy.set('legal');
    expect(component.selectedCaseStudy()).toBe('legal');
  });

  it('should compute beginner distance and find closest words', () => {
    const fixture = TestBed.createComponent(AcademyComponent);
    const component = fixture.componentInstance;

    // Set queryPoint close to puppy [20, 30]
    component.queryPoint.set({ x: 20, y: 29 });
    
    const closest = component.closestWords();
    expect(closest.length).toBe(4);
    // Closest should be 'puppy'
    expect(closest[0].word).toBe('puppy');
  });

  it('should calculate intermediate cosine similarity and angles', () => {
    const fixture = TestBed.createComponent(AcademyComponent);
    const component = fixture.componentInstance;

    // Identical sentences should return 1.0 similarity and 0 degree angle
    component.sentenceA.set('puppy cat');
    component.sentenceB.set('puppy cat');
    
    expect(component.vectorAnalysis().similarity).toBe(1.0);
    expect(component.vectorAnalysis().angleDegrees).toBe(0.0);

    // Completely orthogonal sentences (no common words) should return 0.0 similarity and 90 degree angle
    component.sentenceA.set('puppy');
    component.sentenceB.set('stars');
    
    expect(component.vectorAnalysis().similarity).toBe(0.0);
    expect(component.vectorAnalysis().angleDegrees).toBe(90.0);
  });

  it('should compile expert prompt correctly with or without RAG', () => {
    const fixture = TestBed.createComponent(AcademyComponent);
    const component = fixture.componentInstance;

    component.expertPrompt.set('Tell me about the mascot');
    
    // RAG enabled
    component.ragEnabled.set(true);
    let prompt = component.compiledPrompt();
    expect(prompt).toContain('[RETRIEVED CONTEXT DATABASE]');
    expect(prompt).toContain('mascot'); // Mascot text should be retrieved since 'mascot' is in query

    // RAG disabled
    component.ragEnabled.set(false);
    prompt = component.compiledPrompt();
    expect(prompt).not.toContain('[RETRIEVED CONTEXT DATABASE]');
  });

  it('should run interactive RAG pipeline animation flow correctly', () => {
    const fixture = TestBed.createComponent(AcademyComponent);
    const component = fixture.componentInstance;

    // Initial state
    expect(component.animStep()).toBe(1);
    expect(component.animPlaying()).toBe(false);

    // Select query
    component.selectAnimQuery('Tell me about the company mascot');
    expect(component.animQuery()).toBe('Tell me about the company mascot');
    expect(component.animStep()).toBe(1);

    // Step forward
    component.stepAnim('next');
    expect(component.animStep()).toBe(2);
    expect(component.animPlaying()).toBe(false);

    // Step backward
    component.stepAnim('prev');
    expect(component.animStep()).toBe(1);

    // Step backward wraps around to 6
    component.stepAnim('prev');
    expect(component.animStep()).toBe(6);

    // Start animation
    component.startAnim();
    expect(component.animPlaying()).toBe(true);

    // Reset animation
    component.resetAnim();
    expect(component.animStep()).toBe(1);
    expect(component.animPlaying()).toBe(false);
  });
});

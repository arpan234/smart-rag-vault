import { TestBed } from '@angular/core/testing';
import { VectorDbService } from './vector-db.service';
import { describe, it, expect, beforeEach } from 'vitest';

describe('VectorDbService', () => {
  let service: VectorDbService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [VectorDbService]
    });
    service = TestBed.inject(VectorDbService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('cosineSimilarity', () => {
    it('should return 1 for identical vectors', () => {
      const vecA = [1, 2, 3];
      const vecB = [1, 2, 3];
      const similarity = service.cosineSimilarity(vecA, vecB);
      expect(similarity).toBeCloseTo(1.0, 5);
    });

    it('should return -1 for opposite vectors', () => {
      const vecA = [1, 2, 3];
      const vecB = [-1, -2, -3];
      const similarity = service.cosineSimilarity(vecA, vecB);
      expect(similarity).toBeCloseTo(-1.0, 5);
    });

    it('should return 0 for orthogonal vectors', () => {
      const vecA = [1, 0, 0];
      const vecB = [0, 1, 0];
      const similarity = service.cosineSimilarity(vecA, vecB);
      expect(similarity).toBe(0);
    });

    it('should return 0 if vector lengths are mismatched', () => {
      const vecA = [1, 2];
      const vecB = [1, 2, 3];
      const similarity = service.cosineSimilarity(vecA, vecB);
      expect(similarity).toBe(0);
    });

    it('should return 0 for zero vectors', () => {
      const vecA = [0, 0, 0];
      const vecB = [1, 2, 3];
      const similarity = service.cosineSimilarity(vecA, vecB);
      expect(similarity).toBe(0);
    });

    it('should correctly calculate similarity for arbitrary vectors', () => {
      // vecA = [3, 4, 0] (norm = 5)
      // vecB = [0, 3, 4] (norm = 5)
      // dot product = 3*0 + 4*3 + 0*4 = 12
      // similarity = 12 / (5 * 5) = 12 / 25 = 0.48
      const vecA = [3, 4, 0];
      const vecB = [0, 3, 4];
      const similarity = service.cosineSimilarity(vecA, vecB);
      expect(similarity).toBeCloseTo(0.48, 5);
    });
  });
});

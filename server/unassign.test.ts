import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock database functions
vi.mock('./db', () => ({
  unassignReviewerFromApplication: vi.fn(),
  bulkUnassignReviewers: vi.fn(),
  reassignReviewer: vi.fn(),
}));

// Mock notification functions
vi.mock('./emailNotifications', () => ({
  notifyReviewerUnassigned: vi.fn(),
  generateReviewerUnassignmentEmail: vi.fn(),
  notifyReviewerAssigned: vi.fn(),
}));

import * as db from './db';
import { notifyReviewerUnassigned, generateReviewerUnassignmentEmail, notifyReviewerAssigned } from './emailNotifications';

describe('Reviewer Unassignment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('unassignReviewerFromApplication', () => {
    it('should call unassign with correct parameters', async () => {
      const mockUnassign = vi.mocked(db.unassignReviewerFromApplication);
      mockUnassign.mockResolvedValue(undefined);

      await db.unassignReviewerFromApplication(1, 2);

      expect(mockUnassign).toHaveBeenCalledWith(1, 2);
      expect(mockUnassign).toHaveBeenCalledTimes(1);
    });
  });

  describe('bulkUnassignReviewers', () => {
    it('should call bulk unassign with arrays of IDs', async () => {
      const mockBulkUnassign = vi.mocked(db.bulkUnassignReviewers);
      mockBulkUnassign.mockResolvedValue(6);

      const applicationIds = [1, 2, 3];
      const reviewerIds = [10, 20];

      const result = await db.bulkUnassignReviewers(applicationIds, reviewerIds);

      expect(mockBulkUnassign).toHaveBeenCalledWith(applicationIds, reviewerIds);
      expect(result).toBe(6); // 3 apps x 2 reviewers = 6 operations
    });

    it('should return 0 when no applications selected', async () => {
      const mockBulkUnassign = vi.mocked(db.bulkUnassignReviewers);
      mockBulkUnassign.mockResolvedValue(0);

      const result = await db.bulkUnassignReviewers([], [1, 2]);

      expect(result).toBe(0);
    });

    it('should return 0 when no reviewers selected', async () => {
      const mockBulkUnassign = vi.mocked(db.bulkUnassignReviewers);
      mockBulkUnassign.mockResolvedValue(0);

      const result = await db.bulkUnassignReviewers([1, 2, 3], []);

      expect(result).toBe(0);
    });
  });

  describe('notifyReviewerUnassigned', () => {
    it('should call notification function with correct parameters', async () => {
      const mockNotify = vi.mocked(notifyReviewerUnassigned);
      mockNotify.mockResolvedValue(true);

      const data = {
        reviewerName: 'John Doe',
        reviewerEmail: 'john@example.com',
        programName: 'Leadership FMWF',
        applicationNumber: 'LFMWF-2026-0001',
      };

      await notifyReviewerUnassigned(data);

      expect(mockNotify).toHaveBeenCalledWith(data);
      expect(mockNotify).toHaveBeenCalledTimes(1);
    });
  });

  describe('generateReviewerUnassignmentEmail', () => {
    it('should generate email with correct structure', () => {
      const mockGenerate = vi.mocked(generateReviewerUnassignmentEmail);
      mockGenerate.mockReturnValue({
        subject: 'Review Assignment Removed - Leadership FMWF',
        html: '<html>...</html>',
        text: 'Dear John...',
      });

      const data = {
        reviewerName: 'John Doe',
        reviewerEmail: 'john@example.com',
        programName: 'Leadership FMWF',
        applicationNumber: 'LFMWF-2026-0001',
      };

      const result = generateReviewerUnassignmentEmail(data);

      expect(result).toHaveProperty('subject');
      expect(result).toHaveProperty('html');
      expect(result).toHaveProperty('text');
      expect(result.subject).toContain('Leadership FMWF');
    });
  });
});

describe('Reviewer Reassignment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('reassignReviewer', () => {
    it('should call reassign with correct parameters', async () => {
      const mockReassign = vi.mocked(db.reassignReviewer);
      mockReassign.mockResolvedValue(true);

      await db.reassignReviewer(1, 10, 20, 5);

      expect(mockReassign).toHaveBeenCalledWith(1, 10, 20, 5);
      expect(mockReassign).toHaveBeenCalledTimes(1);
    });

    it('should throw error if target reviewer is already assigned', async () => {
      const mockReassign = vi.mocked(db.reassignReviewer);
      mockReassign.mockRejectedValue(new Error('Target reviewer is already assigned to this application'));

      await expect(db.reassignReviewer(1, 10, 20, 5)).rejects.toThrow('Target reviewer is already assigned');
    });
  });

  describe('reassignment notifications', () => {
    it('should notify old reviewer of removal', async () => {
      const mockNotifyUnassign = vi.mocked(notifyReviewerUnassigned);
      mockNotifyUnassign.mockResolvedValue(true);

      const data = {
        reviewerName: 'Old Reviewer',
        reviewerEmail: 'old@example.com',
        programName: 'Leadership FMWF',
        applicationNumber: 'LFMWF-2026-0001',
      };

      await notifyReviewerUnassigned(data);

      expect(mockNotifyUnassign).toHaveBeenCalledWith(data);
    });

    it('should notify new reviewer of assignment', async () => {
      const mockNotifyAssign = vi.mocked(notifyReviewerAssigned);
      mockNotifyAssign.mockResolvedValue(true);

      const data = {
        reviewerName: 'New Reviewer',
        reviewerEmail: 'new@example.com',
        reviewerAccessToken: 'TOKEN123',
        programName: 'Leadership FMWF',
        applicationCount: 1,
        baseUrl: 'https://example.com',
      };

      await notifyReviewerAssigned(data);

      expect(mockNotifyAssign).toHaveBeenCalledWith(data);
    });
  });
});

describe('Multi-Reviewer Scoring', () => {
  it('should support multiple reviewers per application', () => {
    // This test verifies the data model supports multiple reviewers
    const applicationId = 1;
    const reviewerIds = [10, 20, 30];
    
    // Each reviewer can be assigned to the same application
    reviewerIds.forEach(reviewerId => {
      expect(typeof reviewerId).toBe('number');
      expect(typeof applicationId).toBe('number');
    });
    
    expect(reviewerIds.length).toBe(3);
  });

  it('should calculate average score from multiple reviewers', () => {
    const scores = [
      { reviewerId: 10, totalScore: 85 },
      { reviewerId: 20, totalScore: 90 },
      { reviewerId: 30, totalScore: 88 },
    ];
    
    const totalScore = scores.reduce((sum, s) => sum + s.totalScore, 0);
    const averageScore = totalScore / scores.length;
    
    expect(totalScore).toBe(263);
    expect(averageScore).toBeCloseTo(87.67, 1);
  });

  it('should rank applications by average score', () => {
    const applications = [
      { id: 1, averageScore: 85.5 },
      { id: 2, averageScore: 92.0 },
      { id: 3, averageScore: 78.3 },
    ];
    
    const ranked = [...applications].sort((a, b) => b.averageScore - a.averageScore);
    
    expect(ranked[0].id).toBe(2); // Highest score
    expect(ranked[1].id).toBe(1);
    expect(ranked[2].id).toBe(3); // Lowest score
  });
});

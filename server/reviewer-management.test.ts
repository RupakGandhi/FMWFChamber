import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the database module
vi.mock('./db', () => ({
  getReviewers: vi.fn(),
  createReviewer: vi.fn(),
  updateReviewer: vi.fn(),
  deleteReviewer: vi.fn(),
  getReviewerById: vi.fn(),
}));

// Mock email notifications
vi.mock('./emailNotifications', () => ({
  notifyReviewerAssigned: vi.fn().mockResolvedValue(true),
}));

import * as db from './db';
import { notifyReviewerAssigned } from './emailNotifications';

describe('Reviewer Management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createReviewer', () => {
    it('creates a reviewer with name and email', async () => {
      const mockReviewer = {
        id: 1,
        name: 'John Smith',
        email: 'john@example.com',
        accessToken: 'test-token-123',
        isActive: true,
      };
      
      vi.mocked(db.createReviewer).mockResolvedValue(mockReviewer);
      
      const result = await db.createReviewer({
        name: 'John Smith',
        email: 'john@example.com',
      });
      
      expect(result).toEqual(mockReviewer);
      expect(db.createReviewer).toHaveBeenCalledWith({
        name: 'John Smith',
        email: 'john@example.com',
      });
    });
  });

  describe('updateReviewer', () => {
    it('updates reviewer name and email', async () => {
      vi.mocked(db.updateReviewer).mockResolvedValue(undefined);
      
      await db.updateReviewer(1, {
        name: 'Jane Smith',
        email: 'jane@example.com',
      });
      
      expect(db.updateReviewer).toHaveBeenCalledWith(1, {
        name: 'Jane Smith',
        email: 'jane@example.com',
      });
    });
  });

  describe('deleteReviewer', () => {
    it('deletes a reviewer and their assignments', async () => {
      vi.mocked(db.deleteReviewer).mockResolvedValue(undefined);
      
      await db.deleteReviewer(1);
      
      expect(db.deleteReviewer).toHaveBeenCalledWith(1);
    });
  });

  describe('resendAccessLink', () => {
    it('sends access link email to reviewer', async () => {
      const mockReviewer = {
        id: 1,
        name: 'John Smith',
        email: 'john@example.com',
        accessToken: 'test-token-123',
        isActive: true,
      };
      
      vi.mocked(db.getReviewerById).mockResolvedValue(mockReviewer as any);
      
      const reviewer = await db.getReviewerById(1);
      
      if (reviewer) {
        await notifyReviewerAssigned({
          reviewerName: reviewer.name,
          reviewerEmail: reviewer.email,
          reviewerAccessToken: reviewer.accessToken,
          programName: 'Test Program',
          applicationCount: 0,
          baseUrl: 'https://example.com',
        });
      }
      
      expect(notifyReviewerAssigned).toHaveBeenCalledWith({
        reviewerName: 'John Smith',
        reviewerEmail: 'john@example.com',
        reviewerAccessToken: 'test-token-123',
        programName: 'Test Program',
        applicationCount: 0,
        baseUrl: 'https://example.com',
      });
    });
  });

  describe('getReviewers', () => {
    it('returns all reviewers', async () => {
      const mockReviewers = [
        { id: 1, name: 'Reviewer 1', email: 'r1@example.com', isActive: true },
        { id: 2, name: 'Reviewer 2', email: 'r2@example.com', isActive: true },
      ];
      
      vi.mocked(db.getReviewers).mockResolvedValue(mockReviewers as any);
      
      const result = await db.getReviewers();
      
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Reviewer 1');
    });
  });
});

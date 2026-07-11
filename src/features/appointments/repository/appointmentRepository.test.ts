import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  createAppointment, 
  cancelAppointment, 
  markNoShowAppointment, 
  checkSlotAvailability 
} from './appointmentRepository';
import { runTransaction, getDoc, getDocs, doc } from 'firebase/firestore';

// Mock Firebase Firestore functions
vi.mock('firebase/firestore', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    collection: vi.fn(() => ({ id: 'mock-collection' })),
    doc: vi.fn(() => ({ id: 'mock-doc-id' })),
    query: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    onSnapshot: vi.fn(),
    updateDoc: vi.fn(),
    serverTimestamp: vi.fn(() => 'mock-timestamp'),
    getDoc: vi.fn(),
    getDocs: vi.fn(),
    runTransaction: vi.fn()
  };
});

vi.mock('@/config/firebase', () => ({
  db: {}
}));

describe('appointmentRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('cancelAppointment', () => {
    it('should update appointment status to CANCELLED', async () => {
      await cancelAppointment('appt-123');
      const { updateDoc: mockUpdateDoc } = await import('firebase/firestore');
      expect(mockUpdateDoc).toHaveBeenCalledWith(expect.anything(), {
        status: 'CANCELLED',
        updatedAt: expect.anything()
      });
    });
  });

  describe('markNoShowAppointment', () => {
    it('should update appointment status to NO_SHOW', async () => {
      await markNoShowAppointment('appt-123');
      const { updateDoc: mockUpdateDoc } = await import('firebase/firestore');
      expect(mockUpdateDoc).toHaveBeenCalledWith(expect.anything(), {
        status: 'NO_SHOW',
        updatedAt: expect.anything()
      });
    });
  });

  describe('checkSlotAvailability', () => {
    it('should return true if active bookings are less than maxConcurrent', async () => {
      const mockGetDoc = getDoc as any;
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ maxConcurrent: 3 })
      });

      const mockGetDocs = getDocs as any;
      mockGetDocs.mockResolvedValueOnce({
        size: 1
      });

      const result = await checkSlotAvailability('branch-1', 'service-1', '2026-07-15', '10:00');
      expect(result).toBe(true);
    });

    it('should return false if active bookings equal or exceed maxConcurrent', async () => {
      const mockGetDoc = getDoc as any;
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ maxConcurrent: 2 })
      });

      const mockGetDocs = getDocs as any;
      mockGetDocs.mockResolvedValueOnce({
        size: 2
      });

      const result = await checkSlotAvailability('branch-1', 'service-1', '2026-07-15', '10:00');
      expect(result).toBe(false);
    });
  });
});

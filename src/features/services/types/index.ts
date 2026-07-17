import { ServiceCustomField } from '@/types/firestore';

export interface CreateServiceInput {
  name: string;
  nameEn?: string;
  description?: string;
  descriptionEn?: string;
  category?: string;
  estimatedDurationMinutes: number;
  requiresResource: boolean;
  maxConcurrent: number;
  customFields: ServiceCustomField[];
  workflowId?: string | null;
  queueRangeId?: string | null;
  requireName?: boolean;
}

export interface UpdateServiceInput {
  name?: string;
  nameEn?: string;
  description?: string;
  descriptionEn?: string;
  category?: string;
  estimatedDurationMinutes?: number;
  requiresResource?: boolean;
  maxConcurrent?: number;
  isActive?: boolean;
  customFields?: ServiceCustomField[];
  workflowId?: string | null;
  queueRangeId?: string | null;
  requireName?: boolean;
}

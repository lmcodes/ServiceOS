import { ServiceCustomField } from '@/types/firestore';

export interface CreateServiceInput {
  name: string;
  description?: string;
  category?: string;
  estimatedDurationMinutes: number;
  requiresResource: boolean;
  maxConcurrent: number;
  customFields: ServiceCustomField[];
}

export interface UpdateServiceInput {
  name?: string;
  description?: string;
  category?: string;
  estimatedDurationMinutes?: number;
  requiresResource?: boolean;
  maxConcurrent?: number;
  isActive?: boolean;
  customFields?: ServiceCustomField[];
}

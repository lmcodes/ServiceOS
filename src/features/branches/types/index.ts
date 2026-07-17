import { OperatingHours, Address, TicketLayoutElement, VoiceSettings } from '@/types/firestore';

export interface CreateBranchInput {
  name: string;
  code: string;
  phone?: string;
  email?: string;
  address?: Address;
  timezone: string;
  queuePrefix: string;
  operatingHours: {
    monday: OperatingHours;
    tuesday: OperatingHours;
    wednesday: OperatingHours;
    thursday: OperatingHours;
    friday: OperatingHours;
    saturday: OperatingHours;
    sunday: OperatingHours;
  };
  settings: {
    autoCallNext: boolean;
    noShowTimeoutMinutes: number;
    maxQueueSize: number;
    requirePhone: boolean;
  };
  kioskSettings?: {
    showLogo: boolean;
    idleTimeoutSeconds: number;
    themeColor: 'brand' | 'blue' | 'emerald' | 'violet' | 'amber';
    allowedServiceIds: string[];
    pageSize?: '58mm' | '80mm';
    ticketLayout?: TicketLayoutElement[];
  };
  voiceSettings?: VoiceSettings;
}

export type UpdateBranchInput = Partial<CreateBranchInput> & {
  status?: 'active' | 'inactive';
};

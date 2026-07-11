import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  subscribeAppointmentsForDate, 
  createAppointment, 
  cancelAppointment, 
  markNoShowAppointment, 
  checkInAppointment 
} from '../repository/appointmentRepository';
import { Appointment } from '@/types/firestore';

export function useAppointmentsList(
  branchId: string | null | undefined,
  dateStr: string
) {
  const queryClient = useQueryClient();
  const queryKey = ['appointments', branchId, dateStr];

  const query = useQuery<Appointment[]>({
    queryKey,
    queryFn: () => [],
    enabled: !!branchId && !!dateStr,
  });

  useEffect(() => {
    if (!branchId || !dateStr) return;

    const unsubscribe = subscribeAppointmentsForDate(
      branchId,
      dateStr,
      (items) => {
        queryClient.setQueryData(queryKey, items);
      },
      (error) => {
        console.error('Real-time appointments subscription failed:', error);
      }
    );

    return () => unsubscribe();
  }, [branchId, dateStr, queryClient]);

  return query;
}

export function useCreateAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ 
      tenantId, 
      branchId, 
      serviceId, 
      data 
    }: { 
      tenantId: string; 
      branchId: string; 
      serviceId: string; 
      data: Omit<Appointment, 'id' | 'tenantId' | 'branchId' | 'serviceId' | 'status' | 'createdAt' | 'updatedAt'>;
    }) => createAppointment(tenantId, branchId, serviceId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['appointments', variables.branchId, variables.data.scheduledDate]
      });
    }
  });
}

export function useCancelAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (appointmentId: string) => cancelAppointment(appointmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    }
  });
}

export function useNoShowAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (appointmentId: string) => markNoShowAppointment(appointmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    }
  });
}

export function useCheckInAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ 
      appointmentId, 
      staffUserId 
    }: { 
      appointmentId: string; 
      staffUserId: string; 
    }) => checkInAppointment(appointmentId, staffUserId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['activeQueues'] });
    }
  });
}

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateService, toggleServiceActive } from '../repository/serviceRepository';
import { UpdateServiceInput } from '../types';

export function useUpdateService(branchId: string | null | undefined) {
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: ({ serviceId, data }: { serviceId: string; data: UpdateServiceInput }) => {
      return updateService(serviceId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services', branchId] });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ serviceId, isActive }: { serviceId: string; isActive: boolean }) => {
      return toggleServiceActive(serviceId, isActive);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services', branchId] });
    },
  });

  return { updateMutation, toggleMutation };
}

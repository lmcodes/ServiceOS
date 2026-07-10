import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { createService } from '../repository/serviceRepository';
import { CreateServiceInput } from '../types';

export function useCreateService(branchId: string | null | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateServiceInput) => {
      if (!user?.tenantId) throw new Error('No tenant ID found');
      if (!branchId) throw new Error('No branch ID selected');
      return createService(user.tenantId, branchId, input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services', branchId] });
    },
  });
}

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { createBranch } from '../repository/branchRepository';
import { CreateBranchInput } from '../types';

export function useCreateBranch() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateBranchInput) => {
      if (!user?.tenantId) {
        throw new Error('No tenant ID found');
      }
      return createBranch(user.tenantId, input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches', user?.tenantId] });
    },
  });
}

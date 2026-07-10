import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { updateBranch, deleteBranch } from '../repository/branchRepository';
import { UpdateBranchInput } from '../types';

export function useUpdateBranch() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: ({ branchId, data }: { branchId: string; data: UpdateBranchInput }) => {
      return updateBranch(branchId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches', user?.tenantId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (branchId: string) => {
      return deleteBranch(branchId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches', user?.tenantId] });
    },
  });

  return { updateMutation, deleteMutation };
}

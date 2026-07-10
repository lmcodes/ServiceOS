import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { subscribeBranches, getBranches } from '../repository/branchRepository';

export function useBranches() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const tenantId = user?.tenantId;

  const queryKey = ['branches', tenantId];

  const query = useQuery({
    queryKey,
    queryFn: () => (tenantId ? getBranches(tenantId) : []),
    enabled: !!tenantId,
  });

  useEffect(() => {
    if (!tenantId) return;

    const unsubscribe = subscribeBranches(
      tenantId,
      (branches) => {
        queryClient.setQueryData(queryKey, branches);
      },
      (error) => {
        console.error('Real-time branches subscription failed:', error);
      }
    );

    return () => unsubscribe();
  }, [tenantId, queryClient]);

  return query;
}

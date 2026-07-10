import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { subscribeServices, getServices } from '../repository/serviceRepository';

export function useServices(branchId: string | null | undefined) {
  const queryClient = useQueryClient();
  const queryKey = ['services', branchId];

  const query = useQuery({
    queryKey,
    queryFn: () => (branchId ? getServices(branchId) : []),
    enabled: !!branchId,
  });

  useEffect(() => {
    if (!branchId) return;

    const unsubscribe = subscribeServices(
      branchId,
      (services) => {
        queryClient.setQueryData(queryKey, services);
      },
      (error) => {
        console.error('Real-time services subscription failed:', error);
      }
    );

    return () => unsubscribe();
  }, [branchId, queryClient]);

  return query;
}

import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { subscribeActiveQueues } from '../repository/queueRepository';
import { QueueItem } from '@/types/firestore';

export function useActiveQueues(branchId: string | null | undefined) {
  const queryClient = useQueryClient();
  const queryKey = ['activeQueues', branchId];

  const query = useQuery<QueueItem[]>({
    queryKey,
    queryFn: () => [],
    enabled: !!branchId,
  });

  useEffect(() => {
    if (!branchId) return;

    const unsubscribe = subscribeActiveQueues(
      branchId,
      (items) => {
        queryClient.setQueryData(queryKey, items);
      },
      (error) => {
        console.error('Real-time active queues subscription failed:', error);
      }
    );

    return () => unsubscribe();
  }, [branchId, queryClient]);

  return query;
}

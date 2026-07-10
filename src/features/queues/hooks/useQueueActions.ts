import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { 
  callNextTicket, 
  callSpecificTicket,
  startServingTicket, 
  completeTicket, 
  markNoShow, 
  recallTicket 
} from '../repository/queueRepository';

export function useQueueActions(branchId: string | null | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const invalidate = () => {
    if (branchId) {
      queryClient.invalidateQueries({ queryKey: ['activeQueues', branchId] });
    }
  };

  const callNextMutation = useMutation({
    mutationFn: () => {
      if (!branchId) throw new Error('No branch selected');
      if (!user?.uid) throw new Error('Unauthenticated staff');
      return callNextTicket(branchId, user.uid);
    },
    onSuccess: () => invalidate()
  });

  const callSpecificMutation = useMutation({
    mutationFn: (ticketId: string) => {
      if (!user?.uid) throw new Error('Unauthenticated staff');
      return callSpecificTicket(ticketId, user.uid);
    },
    onSuccess: () => invalidate()
  });

  const startServingMutation = useMutation({
    mutationFn: (ticketId: string) => {
      if (!user?.uid) throw new Error('Unauthenticated staff');
      return startServingTicket(ticketId, user.uid);
    },
    onSuccess: () => invalidate()
  });

  const completeMutation = useMutation({
    mutationFn: (ticketId: string) => {
      return completeTicket(ticketId);
    },
    onSuccess: () => invalidate()
  });

  const noShowMutation = useMutation({
    mutationFn: (ticketId: string) => {
      return markNoShow(ticketId);
    },
    onSuccess: () => invalidate()
  });

  const recallMutation = useMutation({
    mutationFn: (ticketId: string) => {
      return recallTicket(ticketId);
    },
    onSuccess: () => invalidate()
  });

  return {
    callNext: callNextMutation,
    callSpecific: callSpecificMutation,
    startServing: startServingMutation,
    complete: completeMutation,
    noShow: noShowMutation,
    recall: recallMutation
  };
}

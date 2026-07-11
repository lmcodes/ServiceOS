import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { 
  callNextTicket, 
  callSpecificTicket,
  startServingTicket, 
  completeTicket, 
  markNoShow, 
  recallTicket,
  advanceWorkflowStage
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
    mutationFn: ({ counter, currentStageId }: { counter?: string; currentStageId?: string | null } = {}) => {
      if (!branchId) throw new Error('No branch selected');
      if (!user?.uid) throw new Error('Unauthenticated staff');
      return callNextTicket(branchId, user.uid, counter, currentStageId);
    },
    onSuccess: () => invalidate()
  });

  const callSpecificMutation = useMutation({
    mutationFn: ({ ticketId, counter }: { ticketId: string; counter?: string }) => {
      if (!user?.uid) throw new Error('Unauthenticated staff');
      return callSpecificTicket(ticketId, user.uid, counter);
    },
    onSuccess: () => invalidate()
  });

  const startServingMutation = useMutation({
    mutationFn: ({ ticketId, counter }: { ticketId: string; counter?: string }) => {
      if (!user?.uid) throw new Error('Unauthenticated staff');
      return startServingTicket(ticketId, user.uid, counter);
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
    mutationFn: ({ ticketId, counter }: { ticketId: string; counter?: string }) => {
      return recallTicket(ticketId, counter);
    },
    onSuccess: () => invalidate()
  });

  const advanceWorkflowStageMutation = useMutation({
    mutationFn: ({ ticketId, targetStageId }: { ticketId: string; targetStageId: string }) => {
      if (!user?.uid) throw new Error('Unauthenticated staff');
      return advanceWorkflowStage(ticketId, targetStageId, user.uid);
    },
    onSuccess: () => invalidate()
  });

  return {
    callNext: callNextMutation,
    callSpecific: callSpecificMutation,
    startServing: startServingMutation,
    complete: completeMutation,
    noShow: noShowMutation,
    recall: recallMutation,
    advanceWorkflowStage: advanceWorkflowStageMutation
  };
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { agentService, AgentRunLog, AiAgentRun } from '../../services/agentService';
import { queryKeys } from '../../lib/queryKeys';

/**
 * useAgentRunLogs - Cached agent execution logs with 5-minute staleTime.
 */
export function useAgentRunLogs() {
  return useQuery<AgentRunLog[]>({
    queryKey: queryKeys.agents.logs(),
    queryFn: async () => {
      return agentService.getRunLogs();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000,
    initialData: () => agentService.getRunLogs(),
  });
}

/**
 * useRecentAgentRuns - Audit list of AI Agent execution runs with 1-minute staleTime.
 */
export function useRecentAgentRuns(limitCount: number = 15) {
  return useQuery<AiAgentRun[]>({
    queryKey: queryKeys.agents.runs(),
    queryFn: async () => {
      return agentService.getRecentRuns(limitCount);
    },
    staleTime: 60 * 1000, // 1 minute
    gcTime: 15 * 60 * 1000,
  });
}

/**
 * Agent execution mutations with cache invalidation
 */
export function useAgentMutations() {
  const queryClient = useQueryClient();

  const runAutonomousAgentMutation = useMutation({
    mutationFn: async (mode?: string) => {
      return agentService.runAutonomousAgent(mode);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.agents.all });
    },
  });

  const triggerInventoryWatchMutation = useMutation({
    mutationFn: async () => {
      return agentService.triggerInventoryWatch();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.agents.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
    },
  });

  const triggerPricingSuggestionMutation = useMutation({
    mutationFn: async () => {
      return agentService.triggerPricingSuggestion();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.agents.all });
    },
  });

  const generateProductMarketingMutation = useMutation({
    mutationFn: async (productId: string) => {
      return agentService.generateProductMarketingContent(productId);
    },
    onSuccess: (_, productId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.agents.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.detail(productId) });
    },
  });

  return {
    runAutonomousAgent: runAutonomousAgentMutation.mutateAsync,
    triggerInventoryWatch: triggerInventoryWatchMutation.mutateAsync,
    triggerPricingSuggestion: triggerPricingSuggestionMutation.mutateAsync,
    generateProductMarketingContent: generateProductMarketingMutation.mutateAsync,
    isRunningAgent:
      runAutonomousAgentMutation.isPending ||
      triggerInventoryWatchMutation.isPending ||
      triggerPricingSuggestionMutation.isPending ||
      generateProductMarketingMutation.isPending,
  };
}

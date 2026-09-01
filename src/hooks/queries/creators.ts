import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CreatorProfile, CreatorReel, CreatorReelStatus } from '../../types';
import { getCreatorProfile, applyForCreatorProfile } from '../../services/creatorService';
import { getLeaderboard, LeaderboardPeriod, PublicCreatorLeaderboardEntry } from '../../services/creatorLeaderboardService';
import { getCreatorReels, getAllCreatorReelsForAdmin, createCreatorReel, updateReelStatusByAdmin } from '../../services/creatorReelService';
import { queryKeys } from '../../lib/queryKeys';

/**
 * useCreator - Fetch a single creator profile with 5-minute staleTime.
 */
export function useCreator(id?: string) {
  return useQuery<CreatorProfile | null>({
    queryKey: queryKeys.creators.detail(id),
    queryFn: async () => {
      if (!id) return null;
      return getCreatorProfile(id);
    },
    enabled: Boolean(id),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000,
  });
}

/**
 * useCreatorLeaderboard - Public creator leaderboard with 5-minute staleTime.
 * Strip sensitive private info by using sanitized public endpoints.
 */
export function useCreatorLeaderboard(period: LeaderboardPeriod = 'all_time', limitCount: number = 50) {
  return useQuery<PublicCreatorLeaderboardEntry[]>({
    queryKey: queryKeys.creators.leaderboard(period),
    queryFn: async () => {
      return getLeaderboard(period, limitCount);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000,
  });
}

/**
 * useCreatorReels - User's uploaded reels with 3-minute staleTime.
 */
export function useCreatorReels(creatorUserId?: string) {
  return useQuery<CreatorReel[]>({
    queryKey: queryKeys.creators.reels({ creatorUserId }),
    queryFn: async () => {
      if (!creatorUserId) return [];
      return getCreatorReels(creatorUserId);
    },
    enabled: Boolean(creatorUserId),
    staleTime: 3 * 60 * 1000, // 3 minutes
    gcTime: 15 * 60 * 1000,
  });
}

/**
 * useAllCreatorReelsForAdmin - Admin moderation query for creator reels with 2-minute staleTime.
 */
export function useAllCreatorReelsForAdmin() {
  return useQuery<CreatorReel[]>({
    queryKey: queryKeys.creators.reels({ admin: true }),
    queryFn: async () => {
      return getAllCreatorReelsForAdmin();
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 15 * 60 * 1000,
  });
}

/**
 * Creator mutations for application, reel submission, and admin status updates
 */
export function useCreatorMutations() {
  const queryClient = useQueryClient();

  const applyMutation = useMutation({
    mutationFn: async (params: Parameters<typeof applyForCreatorProfile>[0]) => {
      return applyForCreatorProfile(params);
    },
    onSuccess: (creator) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.creators.all });
      queryClient.setQueryData(queryKeys.creators.detail(creator.creatorId), creator);
      queryClient.setQueryData(queryKeys.creators.detail(creator.userId), creator);
    },
  });

  const submitReelMutation = useMutation({
    mutationFn: async (params: Parameters<typeof createCreatorReel>[0]) => {
      return createCreatorReel(params);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.creators.reels({ creatorUserId: variables.creatorUserId }) });
      queryClient.invalidateQueries({ queryKey: queryKeys.creators.reels({ admin: true }) });
    },
  });

  const updateReelStatusMutation = useMutation({
    mutationFn: async ({
      creatorReelId,
      status,
      adminNote,
    }: {
      creatorReelId: string;
      status: CreatorReelStatus;
      adminNote?: string;
    }) => {
      return updateReelStatusByAdmin(creatorReelId, status, adminNote);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.creators.all });
    },
  });

  return {
    applyForCreator: applyMutation.mutateAsync,
    submitReel: submitReelMutation.mutateAsync,
    updateReelStatus: updateReelStatusMutation.mutateAsync,
    isApplying: applyMutation.isPending,
    isSubmittingReel: submitReelMutation.isPending,
    isUpdatingStatus: updateReelStatusMutation.isPending,
  };
}

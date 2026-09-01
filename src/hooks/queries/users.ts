import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserProfile } from '../../types';
import { userService } from '../../services/userService';
import { queryKeys } from '../../lib/queryKeys';

/**
 * useUsers - List all user profiles with 5-minute stale time.
 * Note: Authorization remains strictly authoritative via Firebase Auth and Firestore Security Rules.
 */
export function useUsers() {
  return useQuery({
    queryKey: queryKeys.users.list(),
    queryFn: async () => {
      return userService.getUsers();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000,
    initialData: () => userService.getUsers(),
  });
}

/**
 * useUser - Individual user profile by UID with 5-minute stale time.
 */
export function useUser(uid?: string) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: queryKeys.users.detail(uid),
    queryFn: async () => {
      if (!uid) return null;
      return userService.getUserById(uid) || null;
    },
    enabled: Boolean(uid),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    initialData: () => {
      if (!uid) return undefined;
      const all = queryClient.getQueryData<UserProfile[]>(queryKeys.users.all) || userService.getUsers();
      return all.find((u) => u.uid === uid);
    },
  });
}

/**
 * User mutation hook to update profiles and synchronize TanStack Query cache
 */
export function useUserMutations() {
  const queryClient = useQueryClient();

  const updateUserMutation = useMutation({
    mutationFn: async (user: UserProfile) => {
      return userService.updateUser(user);
    },
    onSuccess: (_, user) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.users.detail(user.uid) });
    },
  });

  const createUserMutation = useMutation({
    mutationFn: async (user: UserProfile) => {
      return userService.createUser(user);
    },
    onSuccess: (_, user) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.users.detail(user.uid) });
    },
  });

  return {
    updateUser: updateUserMutation.mutateAsync,
    createUser: createUserMutation.mutateAsync,
    isUpdating: updateUserMutation.isPending,
    isCreating: createUserMutation.isPending,
  };
}

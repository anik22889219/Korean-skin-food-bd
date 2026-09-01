import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { GlobalThemeSettings, HomeThemeSettings, ShopThemeSettings } from '../../types/theme';
import { themeService, DEFAULT_GLOBAL_THEME, DEFAULT_HOME_THEME, DEFAULT_SHOP_THEME } from '../../services/themeService';
import { fetchSiteSettings } from '../../services/chatbotService';
import { queryKeys } from '../../lib/queryKeys';

/**
 * useGlobalTheme - Global theme settings cached with 30-minute staleTime.
 */
export function useGlobalTheme() {
  return useQuery<GlobalThemeSettings>({
    queryKey: queryKeys.settings.globalTheme(),
    queryFn: async () => {
      return themeService.getGlobalTheme() || DEFAULT_GLOBAL_THEME;
    },
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000, // 60 minutes
    initialData: () => themeService.getGlobalTheme() || DEFAULT_GLOBAL_THEME,
  });
}

/**
 * useHomeTheme - Home layout and section configurations cached with 30-minute staleTime.
 */
export function useHomeTheme() {
  return useQuery<HomeThemeSettings>({
    queryKey: queryKeys.settings.homeTheme(),
    queryFn: async () => {
      return themeService.getHomeTheme() || DEFAULT_HOME_THEME;
    },
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000,
    initialData: () => themeService.getHomeTheme() || DEFAULT_HOME_THEME,
  });
}

/**
 * useShopTheme - Shop catalog layout configuration cached with 30-minute staleTime.
 */
export function useShopTheme() {
  return useQuery<ShopThemeSettings>({
    queryKey: queryKeys.settings.shopTheme(),
    queryFn: async () => {
      return themeService.getShopTheme() || DEFAULT_SHOP_THEME;
    },
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000,
    initialData: () => themeService.getShopTheme() || DEFAULT_SHOP_THEME,
  });
}

/**
 * useSiteSettings - Site settings (WhatsApp numbers, store parameters) cached with 30-minute staleTime.
 */
export function useSiteSettings() {
  return useQuery<{ whatsappNumber: string }>({
    queryKey: queryKeys.settings.site(),
    queryFn: async () => {
      return fetchSiteSettings();
    },
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000,
    initialData: () => ({ whatsappNumber: '8801755837545' }),
  });
}

/**
 * Settings mutation hooks with immediate TanStack Query invalidation
 */
export function useSettingsMutations() {
  const queryClient = useQueryClient();

  const updateGlobalThemeMutation = useMutation({
    mutationFn: async (settings: Partial<GlobalThemeSettings>) => {
      const current = themeService.getGlobalTheme() || DEFAULT_GLOBAL_THEME;
      return themeService.saveGlobalTheme({ ...current, ...settings });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.globalTheme() });
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.site() });
    },
  });

  const updateHomeThemeMutation = useMutation({
    mutationFn: async (settings: Partial<HomeThemeSettings>) => {
      const current = themeService.getHomeTheme() || DEFAULT_HOME_THEME;
      return themeService.saveHomeTheme({ ...current, ...settings });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.homeTheme() });
    },
  });

  const updateShopThemeMutation = useMutation({
    mutationFn: async (settings: Partial<ShopThemeSettings>) => {
      const current = themeService.getShopTheme() || DEFAULT_SHOP_THEME;
      return themeService.saveShopTheme({ ...current, ...settings });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.shopTheme() });
    },
  });

  return {
    saveGlobalTheme: updateGlobalThemeMutation.mutateAsync,
    saveHomeTheme: updateHomeThemeMutation.mutateAsync,
    saveShopTheme: updateShopThemeMutation.mutateAsync,
    isSavingGlobal: updateGlobalThemeMutation.isPending,
    isSavingHome: updateHomeThemeMutation.isPending,
    isSavingShop: updateShopThemeMutation.isPending,
  };
}

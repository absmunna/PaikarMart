import { useCallback, useEffect, useRef, useState } from 'react';
import type { TouchEvent } from 'react';

interface UsePrimaryViewportRefreshOptions {
  refreshCatalog: (signal?: AbortSignal) => Promise<void>;
  refreshServerPosts: (signal?: AbortSignal) => Promise<void>;
}

export function usePrimaryViewportRefresh({
  refreshCatalog,
  refreshServerPosts,
}: UsePrimaryViewportRefreshOptions) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isPullRefreshing, setIsPullRefreshing] = useState(false);
  const pullStartYRef = useRef<number | null>(null);
  const pullThreshold = 72;

  const refreshPrimaryViewportData = useCallback(async (signal?: AbortSignal) => {
    await Promise.all([
      refreshCatalog(signal),
      refreshServerPosts(signal),
    ]);
  }, [refreshCatalog, refreshServerPosts]);

  useEffect(() => {
    const controller = new AbortController();
    void refreshPrimaryViewportData(controller.signal);
    return () => controller.abort();
  }, [refreshPrimaryViewportData]);

  const triggerPullRefresh = useCallback(async () => {
    if (isPullRefreshing) return;
    setIsPullRefreshing(true);
    setPullDistance(56);
    try {
      await Promise.all([
        refreshPrimaryViewportData(),
        new Promise<void>((resolve) => setTimeout(resolve, 500)),
      ]);
    } finally {
      setIsPullRefreshing(false);
      setPullDistance(0);
    }
  }, [isPullRefreshing, refreshPrimaryViewportData]);

  const handleViewportTouchStart = useCallback((event: TouchEvent<HTMLElement>) => {
    if (window.scrollY <= 2 && !isPullRefreshing && event.touches.length === 1) {
      pullStartYRef.current = event.touches[0].clientY;
    } else {
      pullStartYRef.current = null;
    }
  }, [isPullRefreshing]);

  const handleViewportTouchMove = useCallback((event: TouchEvent<HTMLElement>) => {
    if (pullStartYRef.current === null || isPullRefreshing) return;
    const delta = event.touches[0].clientY - pullStartYRef.current;
    if (delta > 0 && window.scrollY <= 2) {
      setPullDistance(Math.min(110, Math.round(delta * 0.5)));
    } else if (delta <= 0) {
      setPullDistance(0);
    }
  }, [isPullRefreshing]);

  const handleViewportTouchEnd = useCallback(() => {
    if (pullStartYRef.current === null) return;
    pullStartYRef.current = null;
    if (pullDistance >= pullThreshold) {
      void triggerPullRefresh();
    } else {
      setPullDistance(0);
    }
  }, [pullDistance, pullThreshold, triggerPullRefresh]);

  return {
    pullDistance,
    isPullRefreshing,
    pullThreshold,
    handleViewportTouchStart,
    handleViewportTouchMove,
    handleViewportTouchEnd,
  };
}

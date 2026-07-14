import { useCallback, useState } from 'react';
import { TAB_KEY, normalizeTab, type Tab } from '../lib/category';

/** 상단 필터 탭 상태 — localStorage 로 지속. */
export function useTab() {
  const [tab, setTabState] = useState<Tab>(() => normalizeTab(localStorage.getItem(TAB_KEY)));

  const setTab = useCallback((t: Tab) => {
    localStorage.setItem(TAB_KEY, t);
    setTabState(t);
  }, []);

  return { tab, setTab };
}

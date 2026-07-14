import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useJournal } from '../hooks/useJournal';
import { useUpdater } from '../hooks/useUpdater';
import { useTab } from '../hooks/useTab';
import { TABS, TAB_LABEL } from '../lib/category';
import { DaySection } from './DaySection';
import { CalendarButton } from './CalendarButton';
import { ThemeButton } from './ThemeButton';
import { LoadingScreen } from './LoadingScreen';

interface Props {
  user: User;
  onLogout: () => void;
  theme: string;
  setTheme: (id: string) => void;
}

export function TodoApp({ user, onLogout, theme, setTheme }: Props) {
  const {
    days,
    loading,
    error,
    todayStr,
    refetch,
    loadMore,
    ensureLoaded,
    add,
    updateContent,
    toggle,
    remove,
    reorder,
    fetchMonthCounts,
  } = useJournal(user.id);

  const { update, status, install, dismiss } = useUpdater();
  const { tab, setTab } = useTab();
  const [focusId, setFocusId] = useState<string | null>(null);
  const [pendingScroll, setPendingScroll] = useState<string | null>(null);
  const dayRefs = useRef(new Map<string, HTMLElement>());
  const sentinelRef = useRef<HTMLDivElement>(null);
  const didInit = useRef(false);
  const loadingMore = useRef(false);
  const prevHeight = useRef(0);

  // 동기화: 창 포커스 / 탭 가시성 복귀 시 refetch (Tauri 네이티브 포커스 포함)
  useEffect(() => {
    const onFocus = () => void refetch();
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refetch();
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisible);

    let unlisten: (() => void) | undefined;
    getCurrentWindow()
      .onFocusChanged(({ payload: focused }) => {
        if (focused) void refetch();
      })
      .then((fn) => {
        unlisten = fn;
      })
      .catch(() => {});

    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisible);
      unlisten?.();
    };
  }, [refetch]);

  // 무한 스크롤: 맨 위 sentinel 이 보이면 과거 더 로드 (위로 스크롤)
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && didInit.current && !loadingMore.current) {
          loadingMore.current = true;
          prevHeight.current = document.documentElement.scrollHeight;
          loadMore();
        }
      },
      { rootMargin: '300px' },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [loadMore]);

  // 최초 로드 후 '오늘' 페이지 맨 위(날짜)로 정렬 — 페인트 전에 처리해 과거가 스치지 않게
  useLayoutEffect(() => {
    if (!didInit.current && !loading && days.length) {
      const el = dayRefs.current.get(todayStr);
      if (el) el.scrollIntoView({ block: 'start' });
      else window.scrollTo(0, document.documentElement.scrollHeight);
      didInit.current = true;
    }
  }, [loading, days, todayStr]);

  // 위로 과거를 더 불러오면 늘어난 높이만큼 보정해 스크롤 위치 유지
  useLayoutEffect(() => {
    if (loadingMore.current) {
      const diff = document.documentElement.scrollHeight - prevHeight.current;
      if (diff > 0) window.scrollBy(0, diff);
      loadingMore.current = false;
    }
  }, [days]);

  // 탭 전환 시: 항상 '오늘' 섹션을 화면 맨 위로 정렬
  useEffect(() => {
    if (loading) return;
    const el = dayRefs.current.get(todayStr);
    if (el) el.scrollIntoView({ block: 'start' });
  }, [tab, loading, todayStr]);

  // 캘린더 점프: 데이터 로드 후 해당 섹션으로 스크롤
  useEffect(() => {
    if (!pendingScroll) return;
    const el = dayRefs.current.get(pendingScroll);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setPendingScroll(null);
    }
  }, [pendingScroll, days]);

  // 탭별 필터: 날짜 섹션은 그대로 두고 항목만 현재 분류로 거른다.
  const visibleDays = useMemo(
    () => days.map((d) => ({ ...d, items: d.items.filter((t) => t.category === tab) })),
    [days, tab],
  );

  async function handleAdd() {
    const id = await add(tab);
    if (id) setFocusId(id);
  }

  function handlePick(dateStr: string) {
    // 미래 날짜는 항상 오늘로 (추가는 오늘만 하므로 미래는 비어 있음)
    const target = dateStr > todayStr ? todayStr : dateStr;
    ensureLoaded(target);
    setPendingScroll(target);
  }

  if (loading) return <LoadingScreen />;

  return (
    <div className="app">
      {update && (
        <div className="update-banner">
          <span className="update-msg">
            새 버전 <b>{update.version}</b> 이 있어요
          </span>
          <div className="update-actions">
            <button type="button" className="update-btn" onClick={install} disabled={status === 'downloading'}>
              {status === 'downloading' ? '설치 중…' : status === 'error' ? '다시 시도' : '업데이트'}
            </button>
            <button type="button" className="update-x" aria-label="나중에" onClick={dismiss}>
              ×
            </button>
          </div>
        </div>
      )}

      <div className="tabbar" role="tablist" aria-label="분류 필터">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            className={`tab tab-${t}${tab === t ? ' active' : ''}`}
            onClick={() => setTab(t)}
          >
            {TAB_LABEL[t]}
          </button>
        ))}
      </div>

      <div className="corner-actions">
        <CalendarButton todayStr={todayStr} onPick={handlePick} fetchMonthCounts={fetchMonthCounts} />
        <ThemeButton theme={theme} setTheme={setTheme} />
        <button type="button" className="link" onClick={onLogout}>
          로그아웃
        </button>
      </div>

      {error && <p className="msg error">{error}</p>}

      <div className="journal">
        <div ref={sentinelRef} className="sentinel" />
        {visibleDays.map((section) => (
            <DaySection
              key={section.dateStr}
              ref={(el) => {
                if (el) dayRefs.current.set(section.dateStr, el);
                else dayRefs.current.delete(section.dateStr);
              }}
              section={section}
              isToday={section.dateStr === todayStr}
              todayStr={todayStr}
              focusId={focusId}
              onAdd={handleAdd}
              onToggle={toggle}
              onDelete={remove}
              onSave={updateContent}
              onReorder={reorder}
            />
        ))}
      </div>
    </div>
  );
}

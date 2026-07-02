import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { useJournal } from '../hooks/useJournal';
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
    fetchMonthCounts,
  } = useJournal(user.id);

  const [focusId, setFocusId] = useState<string | null>(null);
  const [pendingScroll, setPendingScroll] = useState<string | null>(null);
  const dayRefs = useRef(new Map<string, HTMLElement>());
  const sentinelRef = useRef<HTMLDivElement>(null);
  const didInit = useRef(false);
  const loadingMore = useRef(false);
  const prevHeight = useRef(0);

  // 동기화: 창 포커스 시 refetch
  useEffect(() => {
    const onFocus = () => void refetch();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
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

  // 캘린더 점프: 데이터 로드 후 해당 섹션으로 스크롤
  useEffect(() => {
    if (!pendingScroll) return;
    const el = dayRefs.current.get(pendingScroll);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setPendingScroll(null);
    }
  }, [pendingScroll, days]);

  async function handleAdd() {
    const id = await add();
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
        {days.map((section) => (
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
            />
        ))}
      </div>
    </div>
  );
}

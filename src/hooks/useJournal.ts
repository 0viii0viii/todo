import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { addDays, dateToStr, dayStartISO, localTodayStr } from '../lib/date';
import type { Category, Todo, TodoView } from '../lib/types';

export interface DaySection {
  dateStr: string;
  items: TodoView[];
}

const INITIAL_PAST_DAYS = 10;
const LOAD_STEP_DAYS = 14;

/** completed_at(ISO) → 로컬 YYYY-MM-DD. */
function completedLocalDate(iso: string): string {
  return dateToStr(new Date(iso));
}

/**
 * 날짜별 저널 모델.
 * - 미완료(done=false) 전부는 '오늘' 섹션에 이월되어 표시.
 * - 완료 항목은 completed_at 로컬 날짜 섹션에 표시.
 * - 과거로 무한 스크롤(loadMore)하며 완료분을 더 불러온다.
 */
export function useJournal(userId: string | undefined) {
  const todayStr = localTodayStr();
  const [incomplete, setIncomplete] = useState<Todo[]>([]);
  const [completed, setCompleted] = useState<Todo[]>([]);
  const [fromDate, setFromDate] = useState(() => addDays(todayStr, -INITIAL_PAST_DAYS));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    setError(null);

    const [inc, comp] = await Promise.all([
      supabase
        .from('todos')
        .select('*')
        .eq('done', false)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true }),
      supabase
        .from('todos')
        .select('*')
        .eq('done', true)
        .gte('completed_at', dayStartISO(fromDate))
        .order('completed_at', { ascending: true }),
    ]);

    if (inc.error || comp.error) {
      setError((inc.error ?? comp.error)!.message);
      setLoading(false);
      return;
    }
    setIncomplete(inc.data as Todo[]);
    setCompleted(comp.data as Todo[]);
    setLoading(false);
  }, [userId, fromDate]);

  useEffect(() => {
    if (!userId) {
      setIncomplete([]);
      setCompleted([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    void load();
  }, [userId, load]);

  // 날짜 섹션: 오늘 → fromDate 까지 (모든 날짜, 빈 날 포함해 연속)
  const days = useMemo<DaySection[]>(() => {
    const byDate = new Map<string, Todo[]>();
    for (const c of completed) {
      if (!c.completed_at) continue;
      const d = completedLocalDate(c.completed_at);
      (byDate.get(d) ?? byDate.set(d, []).get(d)!).push(c);
    }

    const toView = (t: Todo): TodoView => ({
      ...t,
      carried_over: !t.done && t.target_date < todayStr,
    });

    const sections: DaySection[] = [];
    let d = todayStr;
    while (d >= fromDate) {
      const dayCompleted = (byDate.get(d) ?? []).map(toView);
      const items = d === todayStr ? [...incomplete.map(toView), ...dayCompleted] : dayCompleted;
      sections.push({ dateStr: d, items });
      d = addDays(d, -1);
    }
    // 과거가 위, 오늘이 맨 아래로 (오래된 → 최신)
    return sections.reverse();
  }, [incomplete, completed, fromDate, todayStr]);

  const loadMore = useCallback(() => {
    setFromDate((prev) => addDays(prev, -LOAD_STEP_DAYS));
  }, []);

  // 캘린더 점프: 해당 날짜가 로드 범위보다 과거면 범위를 확장한다.
  const ensureLoaded = useCallback((dateStr: string) => {
    setFromDate((prev) => (dateStr < prev ? dateStr : prev));
  }, []);

  // ---- 변경 작업 ----
  const add = useCallback(
    async (category: Category): Promise<string | undefined> => {
      if (!userId) return;
      // 맨 아래로: 현재 미완료 중 최대 sort_order + 1
      const nextOrder = incomplete.reduce((m, t) => Math.max(m, t.sort_order + 1), 0);
      const { data, error } = await supabase
        .from('todos')
        .insert({ target_date: todayStr, sort_order: nextOrder, category })
        .select()
        .single();
      if (error) {
        setError(error.message);
        return;
      }
      await load();
      return (data as Todo).id;
    },
    [userId, todayStr, load, incomplete],
  );

  // 분류 변경 (업무 ↔ 일상) — 낙관적 갱신.
  const setCategory = useCallback(async (id: string, category: Category) => {
    setIncomplete((prev) => prev.map((t) => (t.id === id ? { ...t, category } : t)));
    setCompleted((prev) => prev.map((t) => (t.id === id ? { ...t, category } : t)));
    const { error } = await supabase.from('todos').update({ category }).eq('id', id);
    if (error) setError(error.message);
  }, []);

  // 타이핑 저장 — refetch 하지 않음(커서 유지). 로컬 content 도 갱신.
  const updateContent = useCallback(async (id: string, content: string) => {
    setIncomplete((prev) => prev.map((t) => (t.id === id ? { ...t, content } : t)));
    setCompleted((prev) => prev.map((t) => (t.id === id ? { ...t, content } : t)));
    const { error } = await supabase.from('todos').update({ content }).eq('id', id);
    if (error) setError(error.message);
  }, []);

  const toggle = useCallback(
    async (todo: TodoView) => {
      const patch = todo.done
        ? { done: false, completed_at: null }
        : { done: true, completed_at: new Date().toISOString() };
      const { error } = await supabase.from('todos').update(patch).eq('id', todo.id);
      if (error) {
        setError(error.message);
        return;
      }
      await load();
    },
    [load],
  );

  const remove = useCallback(
    async (id: string) => {
      const { error } = await supabase.from('todos').delete().eq('id', id);
      if (error) {
        setError(error.message);
        return;
      }
      await load();
    },
    [load],
  );

  // 드래그 재정렬: 낙관적으로 로컬 순서를 바꾸고 sort_order 를 일괄 저장.
  // orderedVisibleIds 는 현재 탭에서 '보이는' 미완료 항목의 새 순서.
  // 필터로 숨겨진 다른 분류 항목은 원래 슬롯에 고정한 채, 보이는 항목만 그 자리들 안에서 재배치한다.
  const reorder = useCallback(
    async (orderedVisibleIds: string[]) => {
      const visible = new Set(orderedVisibleIds);
      let vi = 0;
      const newOrderIds = incomplete.map((t) => (visible.has(t.id) ? orderedVisibleIds[vi++] : t.id));
      const map = new Map(incomplete.map((t) => [t.id, t]));
      const full = newOrderIds.map((id) => map.get(id)).filter(Boolean) as Todo[];
      setIncomplete(full);
      const results = await Promise.all(
        full.map((t, i) => supabase.from('todos').update({ sort_order: i }).eq('id', t.id)),
      );
      const failed = results.find((r) => r.error);
      if (failed?.error) setError(failed.error.message);
    },
    [incomplete],
  );

  // 캘린더용: 해당 월의 날짜별 개수 (완료 수 + 이번 달 오늘 칸엔 미완료 수).
  const fetchMonthCounts = useCallback(
    async (year: number, month0: number): Promise<Record<string, number>> => {
      if (!userId) return {};
      const startStr = dateToStr(new Date(year, month0, 1));
      const endStr = dateToStr(new Date(year, month0 + 1, 1));
      const { data, error } = await supabase
        .from('todos')
        .select('completed_at')
        .eq('done', true)
        .gte('completed_at', dayStartISO(startStr))
        .lt('completed_at', dayStartISO(endStr));
      if (error) {
        setError(error.message);
        return {};
      }
      const counts: Record<string, number> = {};
      for (const r of data as { completed_at: string }[]) {
        const d = completedLocalDate(r.completed_at);
        counts[d] = (counts[d] ?? 0) + 1;
      }
      if (startStr <= todayStr && todayStr < endStr) {
        counts[todayStr] = (counts[todayStr] ?? 0) + incomplete.length;
      }
      return counts;
    },
    [userId, todayStr, incomplete.length],
  );

  return {
    days,
    loading,
    error,
    todayStr,
    refetch: load,
    loadMore,
    ensureLoaded,
    add,
    updateContent,
    toggle,
    remove,
    reorder,
    setCategory,
    fetchMonthCounts,
  };
}

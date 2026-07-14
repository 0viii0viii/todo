import { useEffect, useRef, useState } from 'react';
import { monthGrid, strToDate } from '../lib/date';
import type { Category } from '../lib/types';

interface Props {
  todayStr: string;
  tab: Category;
  onPick: (dateStr: string) => void;
  fetchMonthCounts: (year: number, month0: number, category: Category) => Promise<Record<string, number>>;
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
const monthFmt = new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long' });

export function CalendarButton({ todayStr, tab, onPick, fetchMonthCounts }: Props) {
  const [open, setOpen] = useState(false);
  const today = strToDate(todayStr);
  const [year, setYear] = useState(today.getFullYear());
  const [month0, setMonth0] = useState(today.getMonth());
  const [counts, setCounts] = useState<Record<string, number>>({});
  const wrapRef = useRef<HTMLDivElement>(null);

  // 열려 있을 때 표시 월의 개수 로드
  useEffect(() => {
    if (!open) return;
    let alive = true;
    void fetchMonthCounts(year, month0, tab).then((c) => {
      if (alive) setCounts(c);
    });
    return () => {
      alive = false;
    };
  }, [open, year, month0, tab, fetchMonthCounts]);

  // 바깥 클릭 시 닫기
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  function shiftMonth(delta: number) {
    const d = new Date(year, month0 + delta, 1);
    setYear(d.getFullYear());
    setMonth0(d.getMonth());
  }

  const cells = monthGrid(year, month0);

  return (
    <div className="cal" ref={wrapRef}>
      <button
        type="button"
        className="cal-icon"
        aria-label="달력"
        onClick={() => setOpen((v) => !v)}
      >
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
          <rect x="3.5" y="4.5" width="17" height="16" rx="2.5" />
          <path d="M3.5 9h17M8 3v3M16 3v3" />
        </svg>
      </button>

      {open && (
        <div className="cal-pop" role="dialog">
          <div className="cal-head">
            <button type="button" className="cal-nav" onClick={() => shiftMonth(-1)} aria-label="이전 달">‹</button>
            <span className="cal-title">{monthFmt.format(new Date(year, month0, 1))}</span>
            <button type="button" className="cal-nav" onClick={() => shiftMonth(1)} aria-label="다음 달">›</button>
          </div>

          <div className="cal-grid cal-weekdays">
            {WEEKDAYS.map((w) => (
              <span key={w} className="cal-wd">{w}</span>
            ))}
          </div>

          <div className="cal-grid">
            {cells.map((c) => {
              const count = counts[c.str] ?? 0;
              return (
                <button
                  type="button"
                  key={c.str}
                  className={`cal-cell${c.inMonth ? '' : ' outside'}${c.str === todayStr ? ' today' : ''}`}
                  onClick={() => {
                    onPick(c.str);
                    setOpen(false);
                  }}
                >
                  <span className="cal-day">{c.day}</span>
                  {count > 0 && <span className="cal-count">{count}</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

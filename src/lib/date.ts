// 날짜 경계 판단은 항상 '클라이언트 로컬' 기준으로 한다 (Supabase 기본 UTC 주의, CLAUDE.md §6).

/** Date → 로컬 YYYY-MM-DD. */
export function dateToStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** 로컬 오늘 날짜를 YYYY-MM-DD 로. */
export function localTodayStr(d = new Date()): string {
  return dateToStr(d);
}

/** YYYY-MM-DD → 그 날 자정(로컬) Date. */
export function strToDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

/** 그 날짜 00:00:00(로컬)의 ISO timestamptz. */
export function dayStartISO(s: string): string {
  return strToDate(s).toISOString();
}

/** 그 날짜의 '끝'(= 다음날 00:00, 로컬)의 ISO timestamptz. */
export function dayEndISO(s: string): string {
  return strToDate(addDays(s, 1)).toISOString();
}

/** 로컬 오늘 00:00 ISO (오늘 완료분 하한). */
export function localTodayStartISO(d = new Date()): string {
  return dayStartISO(dateToStr(d));
}

/** YYYY-MM-DD 에 n일 더한 YYYY-MM-DD (음수 가능). */
export function addDays(s: string, n: number): string {
  const d = strToDate(s);
  d.setDate(d.getDate() + n);
  return dateToStr(d);
}

/** 표시용 라벨: "7월 2일 수요일". */
const labelFmt = new Intl.DateTimeFormat('ko-KR', {
  month: 'long',
  day: 'numeric',
  weekday: 'long',
});
export function dayLabel(s: string): string {
  return labelFmt.format(strToDate(s));
}

/** '오늘/어제/내일' 상대 라벨 (없으면 null). */
export function relativeLabel(s: string, todayStr = localTodayStr()): string | null {
  if (s === todayStr) return '오늘';
  if (s === addDays(todayStr, -1)) return '어제';
  if (s === addDays(todayStr, 1)) return '내일';
  return null;
}

/**
 * 달력 그리드용 6주(42칸) 날짜 배열. 일요일 시작.
 * 각 칸은 { str, day, inMonth }.
 */
export function monthGrid(year: number, month0: number) {
  const first = new Date(year, month0, 1);
  const start = new Date(year, month0, 1 - first.getDay()); // 그 주 일요일
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    return { str: dateToStr(d), day: d.getDate(), inMonth: d.getMonth() === month0 };
  });
}

import type { Category } from './types';

/** 상단 필터 탭: 업무 / 일상 (탭이 곧 분류). */
export type Tab = Category;

export const TAB_KEY = 'todo.tab';

export const TABS: Tab[] = ['work', 'life'];

export const TAB_LABEL: Record<Tab, string> = {
  work: '업무',
  life: '일상',
};

/** 저장된 탭 값 검증 (구버전의 'all' 등 무효값은 업무로). */
export function normalizeTab(value: string | null): Tab {
  return value === 'work' || value === 'life' ? value : 'work';
}

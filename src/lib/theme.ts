export interface ThemeDef {
  id: string;
  label: string;
  /** 팝오버 미리보기용 스와치 [배경, 잉크, 강조]. */
  swatch: [string, string, string];
}

export const THEMES: ThemeDef[] = [
  { id: 'paper', label: '페이퍼 & 잉크', swatch: ['#f5f0e4', '#24304a', '#c8503b'] },
  { id: 'legal', label: '리갈 패드', swatch: ['#f8f1c8', '#1c3a5e', '#c0392b'] },
  { id: 'blueprint', label: '블루프린트', swatch: ['#123f5c', '#eaf4fb', '#7fd4e8'] },
  { id: 'midnight', label: '미드나잇', swatch: ['#1c1c24', '#ece6d8', '#d9a441'] },
  { id: 'sakura', label: '사쿠라', swatch: ['#fbeef2', '#4a2a38', '#d56a8f'] },
];

export const DEFAULT_THEME = 'paper';
export const THEME_KEY = 'todo-theme';

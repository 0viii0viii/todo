/** 할 일 분류: 업무 / 일상. */
export type Category = 'work' | 'life';

/** DB `todos` 행 한 개 (서버 원본 그대로). */
export interface Todo {
  id: string;
  user_id: string;
  content: string;
  done: boolean;
  target_date: string; // YYYY-MM-DD
  created_at: string;
  completed_at: string | null;
  sort_order: number;
  category: Category;
}

/** 화면용 Todo — carried_over 는 클라이언트가 계산해 붙인 파생 플래그. */
export interface TodoView extends Todo {
  carried_over: boolean;
}

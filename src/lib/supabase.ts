import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!url || !anonKey) {
  // .env 값이 비어 있으면 콘솔에 명확히 알림 (빌드는 되지만 연결은 안 됨)
  console.error(
    'Supabase 환경변수가 없습니다. .env 에 VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY 를 설정하세요.',
  );
}

export const supabase = createClient(url ?? '', anonKey ?? '');

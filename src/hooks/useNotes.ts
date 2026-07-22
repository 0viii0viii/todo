import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Note } from '../lib/types';

/**
 * 영구 노트 모델 — 최근 수정순.
 * 편집 중 커서 유지를 위해 update/remove 는 낙관적 로컬 갱신만 하고 refetch 하지 않는다.
 */
export function useNotes(userId: string | undefined) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    setError(null);
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .order('updated_at', { ascending: false });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    setNotes(data as Note[]);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setNotes([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    void load();
  }, [userId, load]);

  const add = useCallback(async (): Promise<string | undefined> => {
    if (!userId) return;
    const { data, error } = await supabase.from('notes').insert({}).select().single();
    if (error) {
      setError(error.message);
      return;
    }
    const note = data as Note;
    setNotes((prev) => [note, ...prev]);
    return note.id;
  }, [userId]);

  const update = useCallback(
    async (id: string, patch: Partial<Pick<Note, 'title' | 'content' | 'tags'>>) => {
      setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, ...patch } : n)));
      const { error } = await supabase
        .from('notes')
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) setError(error.message);
    },
    [],
  );

  const remove = useCallback(async (id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    const { error } = await supabase.from('notes').delete().eq('id', id);
    if (error) setError(error.message);
  }, []);

  return { notes, loading, error, add, update, remove, refetch: load };
}

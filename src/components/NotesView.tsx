import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { openUrl } from '@tauri-apps/plugin-opener';
import { useNotes } from '../hooks/useNotes';
import { trimTrailingEmpty } from '../lib/html';
import type { Note } from '../lib/types';

/** 디바운스 저장 — 언마운트(모달 닫기·탭 이동) 시 남은 저장을 즉시 플러시해 유실을 막는다. */
function useDebouncedSave<T>(fn: (value: T) => void, ms: number) {
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const pending = useRef<{ value: T } | null>(null);
  const fnRef = useRef(fn);
  fnRef.current = fn;
  useEffect(
    () => () => {
      clearTimeout(timer.current);
      if (pending.current) fnRef.current(pending.current.value);
    },
    [],
  );
  return (value: T) => {
    pending.current = { value };
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      pending.current = null;
      fnRef.current(value);
    }, ms);
  };
}

function stripHtml(html: string): string {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return (tmp.textContent || '').trim();
}

// 링크 클릭 → 시스템 브라우저 (TodoItem 과 동일 동작)
function handleLinkClick(e: MouseEvent<HTMLDivElement>) {
  const anchor = (e.target as HTMLElement).closest('a');
  const href = anchor?.getAttribute('href');
  if (href) {
    e.preventDefault();
    void openUrl(href).catch(() => window.open(href, '_blank'));
  }
}

export function NotesView({ userId }: { userId: string }) {
  const { notes, loading, error, add, update, remove } = useNotes(userId);
  const [query, setQuery] = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const allTags = useMemo(() => {
    const s = new Set<string>();
    for (const n of notes) for (const t of n.tags) s.add(t);
    return [...s].sort();
  }, [notes]);

  // 검색: 노트 제목 + 태그 기준
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return notes.filter(
      (n) =>
        (!activeTag || n.tags.includes(activeTag)) &&
        (!q || `${n.title} ${n.tags.join(' ')}`.toLowerCase().includes(q)),
    );
  }, [notes, query, activeTag]);

  const openNote = openId ? notes.find((n) => n.id === openId) : undefined;

  async function handleAdd() {
    const id = await add();
    if (id) setOpenId(id);
  }

  return (
    <div className="notes">
      <div className="notes-toolbar">
        <input
          type="search"
          className="notes-search"
          placeholder="노트 검색 (제목·태그)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          spellCheck={false}
        />
        <button type="button" className="note-add" onClick={handleAdd}>
          <span className="plus">＋</span> 새 노트
        </button>
      </div>

      {allTags.length > 0 && (
        <div className="tagbar">
          {allTags.map((t) => (
            <button
              key={t}
              type="button"
              className={`tag-chip${activeTag === t ? ' active' : ''}`}
              onClick={() => setActiveTag((cur) => (cur === t ? null : t))}
            >
              #{t}
            </button>
          ))}
        </div>
      )}

      {error && <p className="msg error">{error}</p>}

      <div className="note-grid">
        {filtered.map((n, i) => {
          const preview = stripHtml(n.content);
          return (
            <button
              key={n.id}
              type="button"
              className="postit"
              style={{ '--rot': `${((i % 5) - 2) * 0.9}deg` } as React.CSSProperties}
              onClick={() => setOpenId(n.id)}
            >
              <span className="postit-title">{n.title || '제목 없음'}</span>
              {preview && <span className="postit-preview">{preview}</span>}
              {n.tags.length > 0 && (
                <span className="postit-tags">
                  {n.tags.map((t) => (
                    <span key={t}>#{t}</span>
                  ))}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {!loading && filtered.length === 0 && (
        <p className="note-empty">
          {notes.length === 0 ? '두고두고 볼 것들을 붙여두는 곳' : '검색 결과가 없어요'}
        </p>
      )}

      {openNote && (
        <NoteModal
          note={openNote}
          onSave={update}
          onDelete={(id) => {
            void remove(id);
            setOpenId(null);
          }}
          onClose={() => setOpenId(null)}
        />
      )}
    </div>
  );
}

interface ModalProps {
  note: Note;
  onSave: (id: string, patch: Partial<Pick<Note, 'title' | 'content' | 'tags'>>) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

function NoteModal({ note, onSave, onDelete, onClose }: ModalProps) {
  const [title, setTitle] = useState(note.title);
  const [tags, setTags] = useState<string[]>(note.tags);
  const [copied, setCopied] = useState(false);
  const saveTitle = useDebouncedSave<string>((t) => onSave(note.id, { title: t }), 500);
  const saveTags = useDebouncedSave<string[]>((t) => onSave(note.id, { tags: t }), 400);
  const saveContent = useDebouncedSave<string>((c) => onSave(note.id, { content: c }), 600);

  // Esc 로 닫기
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ link: false }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: { rel: 'noopener noreferrer' },
      }),
      Placeholder.configure({ placeholder: '내용을 적어보세요…  (URL 은 자동 링크)' }),
    ],
    content: trimTrailingEmpty(note.content || ''),
    autofocus: note.title ? 'end' : false,
    editorProps: {
      attributes: { spellcheck: 'false', autocorrect: 'off', autocapitalize: 'off' },
    },
    onUpdate: ({ editor }) => saveContent(trimTrailingEmpty(editor.getHTML())),
  });

  // 내용 복사 — 투두 복사와 동일 (HTML + 플레인 텍스트)
  async function handleCopy() {
    const html = trimTrailingEmpty(editor?.getHTML() ?? note.content);
    const text = stripHtml(html);
    if (!text) return;
    try {
      if (typeof ClipboardItem !== 'undefined' && navigator.clipboard.write) {
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/html': new Blob([html], { type: 'text/html' }),
            'text/plain': new Blob([text], { type: 'text/plain' }),
          }),
        ]);
      } else {
        await navigator.clipboard.writeText(text);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      } catch {
        /* 클립보드 실패 시 무시 */
      }
    }
  }

  return (
    <div
      className="note-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="note-modal" role="dialog" aria-label="노트 편집">
        <header className="note-head">
          <input
            className="note-title"
            value={title}
            placeholder="제목"
            autoFocus={!note.title}
            spellCheck={false}
            onChange={(e) => {
              setTitle(e.target.value);
              saveTitle(e.target.value);
            }}
          />
          <button
            type="button"
            className={`act copy${copied ? ' copied' : ''}`}
            aria-label={copied ? '복사됨' : '내용 복사'}
            title={copied ? '복사됨' : '내용 복사'}
            onClick={handleCopy}
          >
            {copied ? (
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="11" height="11" rx="2" />
                <path d="M5 15V5a2 2 0 0 1 2-2h10" />
              </svg>
            )}
          </button>
          <button type="button" className="act del" aria-label="노트 삭제" title="삭제" onClick={() => onDelete(note.id)}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
            </svg>
          </button>
          <button type="button" className="act note-close" aria-label="닫기" title="닫기 (Esc)" onClick={onClose}>
            ×
          </button>
        </header>

        <div className="item-body note-modal-body" onClick={handleLinkClick}>
          <EditorContent editor={editor} className="editor" />
        </div>

        <TagRow
          tags={tags}
          onChange={(t) => {
            setTags(t);
            saveTags(t);
          }}
        />
      </div>
    </div>
  );
}

function TagRow({ tags, onChange }: { tags: string[]; onChange: (tags: string[]) => void }) {
  const [draft, setDraft] = useState('');

  function addTag() {
    const t = draft.trim().replace(/^#/, '');
    setDraft('');
    if (!t || tags.includes(t)) return;
    onChange([...tags, t]);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag();
    } else if (e.key === 'Backspace' && !draft && tags.length) {
      onChange(tags.slice(0, -1));
    }
  }

  return (
    <div className="note-tags">
      {tags.map((t) => (
        <button
          key={t}
          type="button"
          className="tag-chip on-card"
          title="태그 제거"
          onClick={() => onChange(tags.filter((x) => x !== t))}
        >
          #{t}
        </button>
      ))}
      <input
        className="tag-input"
        value={draft}
        placeholder="+태그"
        spellCheck={false}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={addTag}
      />
    </div>
  );
}

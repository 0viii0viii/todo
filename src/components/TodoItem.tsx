import {
  forwardRef,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
} from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { openUrl } from '@tauri-apps/plugin-opener';
import { trimTrailingEmpty } from '../lib/html';
import type { TodoView } from '../lib/types';

interface Props {
  todo: TodoView;
  index: number;
  editable: boolean;
  autoFocus: boolean;
  onToggle: (todo: TodoView) => void;
  onDelete: (id: string) => void;
  onSave: (id: string, html: string) => void;
  style?: CSSProperties;
  dragHandle?: ReactNode;
}

// 링크 클릭 → 시스템 브라우저로 열기 (편집/읽기 공통)
function handleLinkClick(e: MouseEvent<HTMLDivElement>) {
  const anchor = (e.target as HTMLElement).closest('a');
  const href = anchor?.getAttribute('href');
  if (href) {
    e.preventDefault();
    void openUrl(href).catch(() => window.open(href, '_blank'));
  }
}

export const TodoItem = forwardRef<HTMLLIElement, Props>(function TodoItem(
  { todo, index, editable, autoFocus, onToggle, onDelete, onSave, style, dragHandle },
  ref,
) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const tmp = document.createElement('div');
    tmp.innerHTML = todo.content || '';
    const text = (tmp.textContent || '').trim();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* 클립보드 접근 실패 시 무시 */
    }
  }

  return (
    <li
      ref={ref}
      className={`item${todo.done ? ' done' : ''}`}
      style={{ '--i': index, ...style } as CSSProperties}
    >
      {dragHandle}
      <input type="checkbox" checked={todo.done} onChange={() => onToggle(todo)} aria-label="완료" />

      {editable ? (
        <EditableBody todo={todo} autoFocus={autoFocus} onSave={onSave} />
      ) : (
        <div
          className="item-body"
          onClick={handleLinkClick}
          dangerouslySetInnerHTML={{
            __html: trimTrailingEmpty(todo.content) || '<p class="ph">빈 항목</p>',
          }}
        />
      )}

      {todo.carried_over && (
        <span className="badge" title={`원래 날짜: ${todo.target_date}`}>이월</span>
      )}

      <button
        type="button"
        className={`act copy${copied ? ' copied' : ''}`}
        aria-label={copied ? '복사됨' : '복사'}
        title={copied ? '복사됨' : '복사'}
        onClick={handleCopy}
      >
        {copied ? (
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="11" height="11" rx="2" />
            <path d="M5 15V5a2 2 0 0 1 2-2h10" />
          </svg>
        )}
      </button>

      <button type="button" className="act del" aria-label="삭제" onClick={() => onDelete(todo.id)}>
        ×
      </button>
    </li>
  );
});

function EditableBody({
  todo,
  autoFocus,
  onSave,
}: {
  todo: TodoView;
  autoFocus: boolean;
  onSave: (id: string, html: string) => void;
}) {
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ link: false }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: { rel: 'noopener noreferrer' },
      }),
      Placeholder.configure({ placeholder: '할 일을 적어보세요…  (URL 은 자동 링크)' }),
    ],
    content: trimTrailingEmpty(todo.content || ''),
    autofocus: autoFocus ? 'end' : false,
    onUpdate: ({ editor }) => {
      clearTimeout(timer.current);
      const html = trimTrailingEmpty(editor.getHTML());
      timer.current = setTimeout(() => onSave(todo.id, html), 700);
    },
    onBlur: ({ editor }) => {
      clearTimeout(timer.current);
      const trimmed = trimTrailingEmpty(editor.getHTML());
      onSave(todo.id, trimmed);
      // 포커스가 빠지면 화면 에디터에서도 끝의 빈 줄을 즉시 제거
      if (trimmed !== editor.getHTML()) {
        editor.commands.setContent(trimmed, { emitUpdate: false });
      }
    },
  });

  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <div className="item-body" onClick={handleLinkClick}>
      <EditorContent editor={editor} className="editor" />
    </div>
  );
}

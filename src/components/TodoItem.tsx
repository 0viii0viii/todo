import { useEffect, useRef, type CSSProperties, type MouseEvent } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { openUrl } from '@tauri-apps/plugin-opener';
import type { TodoView } from '../lib/types';

interface Props {
  todo: TodoView;
  index: number;
  editable: boolean;
  autoFocus: boolean;
  onToggle: (todo: TodoView) => void;
  onDelete: (id: string) => void;
  onSave: (id: string, html: string) => void;
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

export function TodoItem({ todo, index, editable, autoFocus, onToggle, onDelete, onSave }: Props) {
  return (
    <li className={`item${todo.done ? ' done' : ''}`} style={{ '--i': index } as CSSProperties}>
      <input type="checkbox" checked={todo.done} onChange={() => onToggle(todo)} aria-label="완료" />

      {editable ? (
        <EditableBody todo={todo} autoFocus={autoFocus} onSave={onSave} />
      ) : (
        <div
          className="item-body"
          onClick={handleLinkClick}
          dangerouslySetInnerHTML={{ __html: todo.content || '<p class="ph">빈 항목</p>' }}
        />
      )}

      {todo.carried_over && (
        <span className="badge" title={`원래 날짜: ${todo.target_date}`}>이월</span>
      )}
      <button type="button" className="del" aria-label="삭제" onClick={() => onDelete(todo.id)}>
        ×
      </button>
    </li>
  );
}

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
    content: todo.content || '',
    autofocus: autoFocus ? 'end' : false,
    onUpdate: ({ editor }) => {
      clearTimeout(timer.current);
      const html = editor.getHTML();
      timer.current = setTimeout(() => onSave(todo.id, html), 700);
    },
    onBlur: ({ editor }) => {
      clearTimeout(timer.current);
      onSave(todo.id, editor.getHTML());
    },
  });

  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <div className="item-body" onClick={handleLinkClick}>
      <EditorContent editor={editor} className="editor" />
    </div>
  );
}

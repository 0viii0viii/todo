import { forwardRef } from 'react';
import { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { dayLabel, relativeLabel } from '../lib/date';
import type { DaySection as DaySectionData } from '../hooks/useJournal';
import type { TodoView } from '../lib/types';
import { TodoItem } from './TodoItem';

interface Props {
  section: DaySectionData;
  isToday: boolean;
  todayStr: string;
  focusId: string | null;
  onAdd: () => void;
  onToggle: (todo: TodoView) => void;
  onDelete: (id: string) => void;
  onSave: (id: string, html: string) => void;
  onReorder: (orderedIds: string[]) => void;
}

interface RowProps {
  todo: TodoView;
  index: number;
  autoFocus: boolean;
  onToggle: (todo: TodoView) => void;
  onDelete: (id: string) => void;
  onSave: (id: string, html: string) => void;
  onMove: (id: string, dir: -1 | 1) => void;
}

const dragIcon = (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden>
    <circle cx="9" cy="6" r="1.6" />
    <circle cx="15" cy="6" r="1.6" />
    <circle cx="9" cy="12" r="1.6" />
    <circle cx="15" cy="12" r="1.6" />
    <circle cx="9" cy="18" r="1.6" />
    <circle cx="15" cy="18" r="1.6" />
  </svg>
);

function SortableTodoItem({ onMove, ...props }: RowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: props.todo.id,
  });
  // 등장 애니메이션(rise)은 opacity:0 으로 시작 → 애니를 끄면 투명해지므로 opacity 를 되돌린다.
  // 드래그 중 원본은 흐린 자리표시만 하고, 실제 프리뷰는 DragOverlay 가 렌더한다.
  const style = {
    transform: CSS.Transform.toString(transform) ?? 'none',
    transition,
    animation: 'none',
    opacity: isDragging ? 0.25 : 1,
  };
  const handle = (
    <button
      type="button"
      className="drag"
      aria-label="순서 변경 (방향키로 이동)"
      title="드래그 또는 ↑↓ 방향키로 이동"
      {...attributes}
      {...listeners}
      onKeyDown={(e) => {
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          onMove(props.todo.id, -1);
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          onMove(props.todo.id, 1);
        }
      }}
    >
      {dragIcon}
    </button>
  );
  return <TodoItem ref={setNodeRef} style={style} dragHandle={handle} editable {...props} />;
}

export const DaySection = forwardRef<HTMLElement, Props>(function DaySection(
  { section, isToday, todayStr, focusId, onAdd, onToggle, onDelete, onSave, onReorder },
  ref,
) {
  const rel = relativeLabel(section.dateStr, todayStr);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const [activeId, setActiveId] = useState<string | null>(null);

  const incomplete = section.items.filter((t) => !t.done);
  const completed = section.items.filter((t) => t.done);
  const activeTodo = activeId ? incomplete.find((t) => t.id === activeId) : undefined;

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const ids = incomplete.map((t) => t.id);
      const oldIndex = ids.indexOf(String(active.id));
      const newIndex = ids.indexOf(String(over.id));
      if (oldIndex !== -1 && newIndex !== -1) onReorder(arrayMove(ids, oldIndex, newIndex));
    }
  }

  // 방향키 이동 (핸들에 포커스한 상태)
  function moveItem(id: string, dir: -1 | 1) {
    const ids = incomplete.map((t) => t.id);
    const idx = ids.indexOf(id);
    const next = idx + dir;
    if (idx === -1 || next < 0 || next >= ids.length) return;
    onReorder(arrayMove(ids, idx, next));
  }

  return (
    <section className={`day${isToday ? ' is-today' : ''}`} ref={ref}>
      <header className="day-head">
        {rel && <span className="day-rel">{rel}</span>}
        <span className="day-date">{dayLabel(section.dateStr)}</span>
        <span className="day-line" />
      </header>

      {isToday ? (
        <>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={() => setActiveId(null)}
          >
            <SortableContext
              items={incomplete.map((t) => t.id)}
              strategy={verticalListSortingStrategy}
            >
              <ul className="list">
                {incomplete.map((t, i) => (
                  <SortableTodoItem
                    key={t.id}
                    todo={t}
                    index={i}
                    autoFocus={t.id === focusId}
                    onToggle={onToggle}
                    onDelete={onDelete}
                    onSave={onSave}
                    onMove={moveItem}
                  />
                ))}
              </ul>
            </SortableContext>
            <DragOverlay>
              {activeTodo ? (
                <ul className="list drag-overlay">
                  <TodoItem
                    todo={activeTodo}
                    index={0}
                    editable={false}
                    autoFocus={false}
                    onToggle={() => {}}
                    onDelete={() => {}}
                    onSave={() => {}}
                  />
                </ul>
              ) : null}
            </DragOverlay>
          </DndContext>

          {completed.length > 0 && (
            <ul className="list">
              {completed.map((t, i) => (
                <TodoItem
                  key={t.id}
                  todo={t}
                  index={incomplete.length + i}
                  editable={false}
                  autoFocus={false}
                  onToggle={onToggle}
                  onDelete={onDelete}
                  onSave={onSave}
                />
              ))}
            </ul>
          )}

          <button type="button" className="add-row" onClick={onAdd}>
            <span className="plus">＋</span> 할 일 추가
          </button>
        </>
      ) : (
        section.items.length > 0 && (
          <ul className="list">
            {section.items.map((t, i) => (
              <TodoItem
                key={t.id}
                todo={t}
                index={i}
                editable={false}
                autoFocus={false}
                onToggle={onToggle}
                onDelete={onDelete}
                onSave={onSave}
              />
            ))}
          </ul>
        )
      )}
    </section>
  );
});

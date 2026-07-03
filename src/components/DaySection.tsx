import { forwardRef } from 'react';
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
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

function SortableTodoItem(props: RowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: props.todo.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : undefined,
    zIndex: isDragging ? 5 : undefined,
  };
  const handle = (
    <button type="button" className="drag" aria-label="순서 변경" {...attributes} {...listeners}>
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

  const incomplete = section.items.filter((t) => !t.done);
  const completed = section.items.filter((t) => t.done);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const ids = incomplete.map((t) => t.id);
      const oldIndex = ids.indexOf(String(active.id));
      const newIndex = ids.indexOf(String(over.id));
      if (oldIndex !== -1 && newIndex !== -1) onReorder(arrayMove(ids, oldIndex, newIndex));
    }
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
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
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
                  />
                ))}
              </ul>
            </SortableContext>
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

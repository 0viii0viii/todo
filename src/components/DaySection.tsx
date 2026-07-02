import { forwardRef } from 'react';
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
}

export const DaySection = forwardRef<HTMLElement, Props>(function DaySection(
  { section, isToday, todayStr, focusId, onAdd, onToggle, onDelete, onSave },
  ref,
) {
  const rel = relativeLabel(section.dateStr, todayStr);

  return (
    <section className={`day${isToday ? ' is-today' : ''}`} ref={ref}>
      <header className="day-head">
        {rel && <span className="day-rel">{rel}</span>}
        <span className="day-date">{dayLabel(section.dateStr)}</span>
        <span className="day-line" />
      </header>

      {section.items.length > 0 && (
        <ul className="list">
          {section.items.map((t, i) => (
            <TodoItem
              key={t.id}
              todo={t}
              index={i}
              editable={isToday && !t.done}
              autoFocus={t.id === focusId}
              onToggle={onToggle}
              onDelete={onDelete}
              onSave={onSave}
            />
          ))}
        </ul>
      )}

      {isToday && (
        <button type="button" className="add-row" onClick={onAdd}>
          <span className="plus">＋</span> 할 일 추가
        </button>
      )}
    </section>
  );
});

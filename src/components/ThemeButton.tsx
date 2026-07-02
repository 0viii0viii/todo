import { useEffect, useRef, useState } from 'react';
import { THEMES } from '../lib/theme';

interface Props {
  theme: string;
  setTheme: (id: string) => void;
}

export function ThemeButton({ theme, setTheme }: Props) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  return (
    <div className="theme" ref={wrapRef}>
      <button
        type="button"
        className="theme-icon"
        aria-label="테마"
        onClick={() => setOpen((v) => !v)}
      >
        <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3a9 9 0 1 0 0 18c1 0 1.6-.8 1.6-1.7 0-.5-.2-.9-.5-1.2-.3-.3-.5-.7-.5-1.1 0-.9.7-1.6 1.6-1.6H16a5 5 0 0 0 5-5c0-3.9-4-7.4-9-7.4Z" />
          <circle cx="7.5" cy="11.5" r="1.1" fill="currentColor" stroke="none" />
          <circle cx="10.5" cy="7.5" r="1.1" fill="currentColor" stroke="none" />
          <circle cx="15" cy="8" r="1.1" fill="currentColor" stroke="none" />
        </svg>
      </button>

      {open && (
        <div className="theme-pop" role="dialog">
          {THEMES.map((t) => (
            <button
              type="button"
              key={t.id}
              className={`theme-row${t.id === theme ? ' active' : ''}`}
              onClick={() => {
                setTheme(t.id);
                setOpen(false);
              }}
            >
              <span className="theme-sw" aria-hidden>
                {t.swatch.map((c, i) => (
                  <span key={i} style={{ background: c }} />
                ))}
              </span>
              <span className="theme-name">{t.label}</span>
              {t.id === theme && <span className="theme-check">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

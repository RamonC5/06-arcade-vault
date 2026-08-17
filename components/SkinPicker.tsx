'use client';

import { skinLabel } from '@/lib/skins';

interface SkinPickerProps {
  /** Currently selected skin key. */
  value: string;
  /** Skin keys offered by the game, in display order. */
  options: string[];
  onChange: (key: string) => void;
  label?: string;
}

/**
 * The skin `<select>` as a `.hud-stat`, so it lines up with the other HUD stats
 * on every play page. Purely presentational: the page owns the state and the
 * persistence.
 */
export default function SkinPicker({
  value,
  options,
  onChange,
  label = 'Skin',
}: SkinPickerProps) {
  return (
    <div className="hud-stat">
      <div className="l">{label}</div>
      <div className="v">
        <select
          value={value}
          aria-label={label}
          onChange={(e) => onChange(e.target.value)}
          style={{
            background: 'transparent',
            border: '1px solid var(--ink-dim)',
            color: 'var(--ink)',
            fontFamily: 'inherit',
            fontSize: 'inherit',
            cursor: 'pointer',
            padding: '2px 4px',
          }}
        >
          {options.map((key) => (
            <option
              key={key}
              value={key}
              style={{ background: 'var(--bg-2)', color: 'var(--ink)' }}
            >
              {skinLabel(key)}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

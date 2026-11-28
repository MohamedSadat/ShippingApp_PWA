import type { CSSProperties } from "react";
import { Icon } from "./Icon";

/** A search box with a leading magnifier, for filtering a loaded list. */
export function SearchField({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="search-field">
      <Icon name="search" size={18} className="search-field__icon" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
      />
    </label>
  );
}

export interface ChipOption<T extends string> {
  value: T;
  label: string;
  count?: number;
  /** CSS colour for the chip's dot (status tones). */
  color?: string;
}

/** One-of-many filter chips that scroll sideways on a phone. */
export function FilterChips<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: ChipOption<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div className="filter-chips" role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={option.value === value}
          className={`filter-chip${option.value === value ? " filter-chip--active" : ""}`}
          style={option.color ? ({ "--tone": option.color } as CSSProperties) : undefined}
          onClick={() => onChange(option.value)}
        >
          {option.color && <span className="filter-chip__dot" aria-hidden="true" />}
          {option.label}
          {option.count !== undefined && <span className="filter-chip__count">{option.count}</span>}
        </button>
      ))}
    </div>
  );
}

import React, { useId } from 'react';

export interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (value: number) => void;
  className?: string;
}

export const Slider: React.FC<SliderProps> = ({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  onChange,
  className = '',
}) => {
  const sliderId = useId();
  const safeRange = Math.max(0.0001, max - min);
  const percentage = Math.min(100, Math.max(0, ((value - min) / safeRange) * 100));

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <div className="flex items-center justify-between text-xs">
        <label
          htmlFor={sliderId}
          className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]"
        >
          {label}
        </label>
        <span className="font-mono text-[var(--accent-text)] text-[11px]">
          {value}
          {unit}
        </span>
      </div>
      <div className="relative flex items-center">
        <input
          id={sliderId}
          type="range"
          aria-label={label}
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{
            background: `linear-gradient(to right, var(--accent) ${percentage}%, var(--slider-track) ${percentage}%)`,
          }}
          className="studio-slider w-full h-1.5 rounded-lg appearance-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/60"
        />
      </div>
    </div>
  );
};

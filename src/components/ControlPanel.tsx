import type { ChangeEvent } from 'react';
import type { DemoColor } from '../types';

type ControlPanelProps = {
  colors: DemoColor[];
  selectedColor: DemoColor;
  search: string;
  opacityPercent: number;
  shadingMode: boolean;
  arLightMode: boolean;
  onSearchChange: (value: string) => void;
  onSelectColor: (color: DemoColor) => void;
  onOpacityChange: (value: number) => void;
  onShadingToggle: (value: boolean) => void;
  onArLightToggle: (value: boolean) => void;
};

const toRgbCss = (rgb: [number, number, number]): string => `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;

export default function ControlPanel({
  colors,
  selectedColor,
  search,
  opacityPercent,
  shadingMode,
  arLightMode,
  onSearchChange,
  onSelectColor,
  onOpacityChange,
  onShadingToggle,
  onArLightToggle,
}: ControlPanelProps): JSX.Element {
  const normalizedSearch = search.trim().toLowerCase();

  const handleSearch = (event: ChangeEvent<HTMLInputElement>): void => {
    onSearchChange(event.target.value);
  };

  const toneGroups = Array.from(new Set(colors.map((color) => color.code.split('-')[1] ?? ''))).filter(Boolean);

  const filtered = colors.filter((c) => {
    if (!normalizedSearch) {
      return true;
    }

    const code = c.code.toLowerCase();
    const tone = (c.code.split('-')[1] ?? '').toLowerCase();
    return code.includes(normalizedSearch) || tone.includes(normalizedSearch);
  });

  return (
    <aside className="panel">
      <h1>PaintRoom Demo – NCS Style</h1>
      <p className="disclaimer">Synthetic demo colors only (not official NCS data).</p>

      <label className="field-label" htmlFor="color-search">
        Search NCS tone / code
      </label>
      <input
        id="color-search"
        className="search-input"
        value={search}
        onChange={handleSearch}
        placeholder="e.g. G50Y, R90B, 2040"
      />

      <div className="tone-pills" aria-label="Tone shortcuts">
        {toneGroups.slice(0, 8).map((tone) => (
          <button
            key={tone}
            type="button"
            className={`pill ${normalizedSearch === tone.toLowerCase() ? 'active' : ''}`}
            onClick={() => onSearchChange(tone)}
          >
            {tone}
          </button>
        ))}
      </div>

      <p className="result-count">{filtered.length} colors found</p>

      <div className="selected-block">
        <div className="swatch" style={{ backgroundColor: toRgbCss(selectedColor.rgb) }} />
        <div>
          <div className="selected-code">{selectedColor.code}</div>
          <div className="selected-rgb">{toRgbCss(selectedColor.rgb)}</div>
        </div>
      </div>

      <label className="field-label" htmlFor="opacity-slider">
        Opacity: {opacityPercent}%
      </label>
      <input
        id="opacity-slider"
        type="range"
        min={0}
        max={100}
        value={opacityPercent}
        onChange={(e) => onOpacityChange(Number(e.target.value))}
      />

      <label className="toggle-row">
        <input
          type="checkbox"
          checked={shadingMode}
          onChange={(e) => onShadingToggle(e.target.checked)}
        />
        Shading mode
      </label>

      <label className="toggle-row">
        <input
          type="checkbox"
          checked={arLightMode}
          onChange={(e) => onArLightToggle(e.target.checked)}
        />
        AR light follow (device tilt)
      </label>

      <div className="list" role="listbox" aria-label="NCS style colors">
        {filtered.length > 0 ? (
          filtered.map((color) => (
            <button
              key={`${color.code}-${color.rgb.join('-')}`}
              className={`list-item ${color.code === selectedColor.code ? 'active' : ''}`}
              onClick={() => onSelectColor(color)}
            >
              <span className="chip" style={{ backgroundColor: toRgbCss(color.rgb) }} />
              <span>{color.code}</span>
            </button>
          ))
        ) : (
          <p className="empty-state">No tones match your search.</p>
        )}
      </div>
    </aside>
  );
}

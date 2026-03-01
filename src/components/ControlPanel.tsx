import type { ChangeEvent } from 'react';
import type { DemoColor } from '../types';

type ControlPanelProps = {
  colors: DemoColor[];
  selectedColor: DemoColor;
  search: string;
  opacityPercent: number;
  shadingMode: boolean;
  onSearchChange: (value: string) => void;
  onSelectColor: (color: DemoColor) => void;
  onOpacityChange: (value: number) => void;
  onShadingToggle: (value: boolean) => void;
};

const toRgbCss = (rgb: [number, number, number]): string => `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;

export default function ControlPanel({
  colors,
  selectedColor,
  search,
  opacityPercent,
  shadingMode,
  onSearchChange,
  onSelectColor,
  onOpacityChange,
  onShadingToggle,
}: ControlPanelProps): JSX.Element {
  const handleSearch = (event: ChangeEvent<HTMLInputElement>): void => {
    onSearchChange(event.target.value);
  };

  const filtered = colors.filter((c) => c.code.toLowerCase().includes(search.toLowerCase()));

  return (
    <aside className="panel">
      <h1>PaintRoom Demo – NCS Style</h1>
      <p className="disclaimer">Synthetic demo colors only (not official NCS data).</p>

      <label className="field-label" htmlFor="color-search">
        Search code
      </label>
      <input
        id="color-search"
        className="search-input"
        value={search}
        onChange={handleSearch}
        placeholder="NCS S 2040-G50Y"
      />

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

      <div className="list" role="listbox" aria-label="NCS style colors">
        {filtered.map((color) => (
          <button
            key={`${color.code}-${color.rgb.join('-')}`}
            className={`list-item ${color.code === selectedColor.code ? 'active' : ''}`}
            onClick={() => onSelectColor(color)}
          >
            <span className="chip" style={{ backgroundColor: toRgbCss(color.rgb) }} />
            <span>{color.code}</span>
          </button>
        ))}
      </div>
    </aside>
  );
}

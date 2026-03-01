import { useMemo, useState } from 'react';
import WebcamCanvas from './components/WebcamCanvas';
import ControlPanel from './components/ControlPanel';
import { generateNcsStylePalette } from './utils/colorGenerator';
import type { DemoColor } from './types';

export default function App(): JSX.Element {
  const palette = useMemo(() => generateNcsStylePalette(), []);
  const [selectedColor, setSelectedColor] = useState<DemoColor>(palette[0]);
  const [search, setSearch] = useState('');
  const [opacityPercent, setOpacityPercent] = useState(72);
  const [shadingMode, setShadingMode] = useState(true);
  const [arLightMode, setArLightMode] = useState(true);

  return (
    <main className="app-shell">
      <WebcamCanvas
        selectedColor={selectedColor}
        opacityPercent={opacityPercent}
        shadingMode={shadingMode}
        arLightMode={arLightMode}
      />
      <ControlPanel
        colors={palette}
        selectedColor={selectedColor}
        search={search}
        opacityPercent={opacityPercent}
        shadingMode={shadingMode}
        arLightMode={arLightMode}
        onSearchChange={setSearch}
        onSelectColor={setSelectedColor}
        onOpacityChange={setOpacityPercent}
        onShadingToggle={setShadingMode}
        onArLightToggle={setArLightMode}
      />
    </main>
  );
}

import type { NumericParameterDefinition } from '../../simulation/core/types';

interface ParameterSliderProps {
  definition: NumericParameterDefinition;
  value: number;
  onChange: (value: number) => void;
}

export const ParameterSlider = ({ definition, value, onChange }: ParameterSliderProps) => {
  const formatted = Number.isInteger(definition.step)
    ? Math.round(value).toString()
    : value.toFixed(definition.step < 0.01 ? 3 : 2).replace(/\.?0+$/, '');

  return (
    <label className="parameter-slider">
      <span className="parameter-slider__top">
        <span>{definition.label}</span>
        <output>
          {formatted}
          {definition.unit ?? ''}
        </output>
      </span>
      <input
        type="range"
        min={definition.min}
        max={definition.max}
        step={definition.step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
};

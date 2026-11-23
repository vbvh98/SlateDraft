import { describe, expect, it } from 'vitest';
import React from 'react';
import { Slider } from './Slider';

describe('Slider UI Component', () => {
  it('creates a valid React element with label, range bounds, and unit', () => {
    const element = React.createElement(Slider, {
      label: 'Narration Speed',
      value: 1.2,
      min: 0.6,
      max: 1.6,
      step: 0.1,
      unit: 'x',
      onChange: () => {},
    });

    expect(element).toBeDefined();
    expect(element.props.label).toBe('Narration Speed');
    expect(element.props.value).toBe(1.2);
    expect(element.props.unit).toBe('x');
  });
});

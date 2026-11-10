import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import type { OgeTagBoxDisplayMode } from '@oge-ui/behavior';
import { OgeInputsConfigProvider } from './inputs-config';
import { OgeTagBox } from './tag-box';

const CITIES = ['Ankara', 'Berlin', 'Cairo', 'Dublin'];
const combo = () => screen.getByRole('combobox') as HTMLInputElement;
const summary = () => document.querySelector('.oge-tag-summary');
const chips = () => document.querySelectorAll('.oge-tag:not(.oge-tag-more)');

function Host({
  initial,
  displayMode = 'count',
  countThreshold,
  onValue,
}: {
  initial: readonly unknown[];
  displayMode?: OgeTagBoxDisplayMode;
  countThreshold?: number;
  onValue?: (value: readonly unknown[]) => void;
}) {
  const [value, setValue] = useState<readonly unknown[]>(initial);
  return (
    <OgeTagBox
      label="Cities"
      items={CITIES}
      displayMode={displayMode}
      countThreshold={countThreshold}
      value={value}
      onValueChange={(next) => {
        setValue(next);
        onValue?.(next);
      }}
    />
  );
}

describe('<OgeTagBox> displayMode', () => {
  it('count: a chip up to the threshold, then the localized count', () => {
    const { unmount } = render(<Host initial={['Ankara']} />);
    expect(chips().length).toBe(1);
    expect(summary()).toBeNull();
    unmount();
    render(<Host initial={['Ankara', 'Berlin', 'Cairo']} />);
    expect(chips().length).toBe(0);
    expect(summary()).toHaveTextContent('3 selected');
    expect(summary()).toHaveAttribute('title', 'Ankara, Berlin, Cairo');
    expect(combo().getAttribute('aria-describedby')).toContain(
      summary()?.id as string,
    );
  });

  it('count respects countThreshold', () => {
    render(<Host initial={['Ankara', 'Berlin', 'Cairo']} countThreshold={3} />);
    expect(chips().length).toBe(3);
  });

  it('text: one comma-separated line', () => {
    render(<Host initial={['Ankara', 'Dublin']} displayMode="text" />);
    expect(summary()).toHaveTextContent('Ankara, Dublin');
    expect(chips().length).toBe(0);
  });

  it('Backspace removes nothing hidden behind a summary', () => {
    const onValue = vi.fn();
    render(<Host initial={['Ankara', 'Berlin']} onValue={onValue} />);
    fireEvent.keyDown(combo(), { key: 'Backspace' });
    expect(onValue).not.toHaveBeenCalled();
  });

  it('takes the count text from the messages', () => {
    render(
      <OgeInputsConfigProvider
        config={{ messages: { selectedCount: '{count} şehir' } }}
      >
        <Host initial={['Ankara', 'Berlin']} />
      </OgeInputsConfigProvider>,
    );
    expect(summary()).toHaveTextContent('2 şehir');
  });
});

import { fireEvent, render, screen } from '@testing-library/react';
import { StrictMode, createRef, useState } from 'react';
import { OgeCheckBox, type OgeCheckBoxHandle } from './check-box';
import { OgeRadioGroup } from './radio-group';
import { OgeSwitch } from './switch';

describe('<OgeCheckBox>', () => {
  it('renders a native checkbox with the house classes and toggles', () => {
    const onValueChange = vi.fn();
    render(<OgeCheckBox onValueChange={onValueChange}>Terms</OgeCheckBox>);
    const box = screen.getByRole('checkbox');
    expect(box.closest('.oge-check-box')).not.toBeNull();
    fireEvent.click(box);
    expect(onValueChange).toHaveBeenCalledWith(true);
  });

  it('null renders the indeterminate state on the native input', () => {
    render(<OgeCheckBox value={null} label="All" />);
    const box = screen.getByRole('checkbox') as HTMLInputElement;
    expect(box.indeterminate).toBe(true);
    expect(box.closest('.oge-check-box')).toHaveClass(
      'oge-check-box-indeterminate',
    );
  });

  it('threeState cycles null → true → false → null', () => {
    function Host() {
      const [value, setValue] = useState<boolean | null>(null);
      return (
        <OgeCheckBox
          threeState
          value={value}
          onValueChange={setValue}
          label="Tri"
        />
      );
    }
    render(<Host />);
    const box = screen.getByRole('checkbox') as HTMLInputElement;
    fireEvent.click(box);
    expect(box.checked).toBe(true);
    fireEvent.click(box);
    expect(box.checked).toBe(false);
    fireEvent.click(box);
    expect(box.indeterminate).toBe(true);
  });

  it('readonly blocks user toggling; the handle toggle respects it too', () => {
    const onValueChange = vi.fn();
    const ref = createRef<OgeCheckBoxHandle>();
    render(
      <OgeCheckBox
        ref={ref}
        readonly
        onValueChange={onValueChange}
        label="x"
      />,
    );
    fireEvent.click(screen.getByRole('checkbox'));
    ref.current!.toggle();
    expect(onValueChange).not.toHaveBeenCalled();
  });
});

describe('<OgeSwitch>', () => {
  it('is a role=switch button with aria-checked and localized track text', () => {
    const onValueChange = vi.fn();
    render(
      <OgeSwitch label="Notify" value={false} onValueChange={onValueChange} />,
    );
    const sw = screen.getByRole('switch', { name: 'Notify' });
    expect(sw).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByText('OFF')).toHaveClass('oge-switch-text');
    fireEvent.click(sw);
    expect(onValueChange).toHaveBeenCalledWith(true);
  });

  it('empty track texts hide the text element', () => {
    render(<OgeSwitch label="Quiet" onText="" offText="" />);
    expect(document.querySelector('.oge-switch-text')).toBeNull();
  });
});

const PLANS = [
  { id: 'free', name: 'Free' },
  { id: 'pro', name: 'Pro' },
  { id: 'team', name: 'Team', off: true },
];

describe('<OgeRadioGroup>', () => {
  it('renders the radiogroup pattern from the expression vocabulary', () => {
    render(
      <OgeRadioGroup
        label="Plan"
        items={PLANS}
        displayExpr="name"
        valueExpr="id"
        disabledExpr="off"
        value="pro"
      />,
    );
    const group = screen.getByRole('radiogroup', { name: 'Plan' });
    expect(group).toHaveClass('oge-radio-group');
    const pro = screen.getByRole('radio', { name: 'Pro' });
    expect(pro).toHaveAttribute('aria-checked', 'true');
    expect(pro).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('radio', { name: 'Free' })).toHaveAttribute(
      'tabindex',
      '-1',
    );
    expect(screen.getByRole('radio', { name: 'Team' })).toBeDisabled();
  });

  it('arrows move focus and selection, skipping disabled items', () => {
    function Host() {
      const [plan, setPlan] = useState<unknown>('free');
      return (
        <OgeRadioGroup
          label="Plan"
          items={PLANS}
          displayExpr="name"
          valueExpr="id"
          disabledExpr="off"
          value={plan}
          onValueChange={setPlan}
        />
      );
    }
    render(<Host />);
    const group = screen.getByRole('radiogroup');
    fireEvent.keyDown(group, { key: 'ArrowDown' });
    expect(screen.getByRole('radio', { name: 'Pro' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    // Team is disabled → wraps back to Free
    fireEvent.keyDown(group, { key: 'ArrowDown' });
    expect(screen.getByRole('radio', { name: 'Free' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
  });

  it('clicking a radio commits its valueExpr result once', () => {
    const onValueChange = vi.fn();
    function Host() {
      const [plan, setPlan] = useState<unknown>('free');
      return (
        <OgeRadioGroup
          label="Plan"
          items={PLANS}
          displayExpr="name"
          valueExpr="id"
          value={plan}
          onValueChange={(next) => {
            onValueChange(next);
            setPlan(next);
          }}
        />
      );
    }
    render(<Host />);
    fireEvent.click(screen.getByRole('radio', { name: 'Pro' }));
    expect(onValueChange).toHaveBeenCalledWith('pro');
    onValueChange.mockClear();
    // radios can't unselect: clicking the checked one is a no-op commit-wise
    fireEvent.click(screen.getByRole('radio', { name: 'Pro' }));
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it('survives a StrictMode remount cycle', () => {
    const onValueChange = vi.fn();
    render(
      <StrictMode>
        <OgeRadioGroup
          label="Plan"
          items={PLANS}
          displayExpr="name"
          valueExpr="id"
          onValueChange={onValueChange}
        />
      </StrictMode>,
    );
    fireEvent.click(screen.getByRole('radio', { name: 'Free' }));
    expect(onValueChange).toHaveBeenCalledWith('free');
  });
});

import { createRef } from 'react';
import { act, fireEvent, render } from '@testing-library/react';
import { OgeForm } from './form';
import type { OgeFormHandle, OgeFormNodeDefinition } from './form-types';

async function flush(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

const data = () => ({ firstName: '', email: '', note: '' });

const twoGroups: OgeFormNodeDefinition[] = [
  { caption: 'Personal', children: [{ field: 'firstName', isRequired: true }] },
  { caption: 'Contact', children: [{ field: 'email' }] },
];

describe('tabbed sections', () => {
  it('renders one tab per group, with the group caption as its label', () => {
    render(
      <OgeForm
        defaultFormData={data()}
        layout={[{ kind: 'tabs', children: twoGroups }]}
      />,
    );
    const tabs = document.querySelectorAll('[role="tab"] .oge-tab-text');
    expect(Array.from(tabs).map((tab) => tab.textContent?.trim())).toEqual([
      'Personal',
      'Contact',
    ]);
    expect(document.querySelector('.oge-form-tabs')).toBeTruthy();
  });

  it('wraps a bare item so every panel still has a caption', () => {
    render(
      <OgeForm
        defaultFormData={data()}
        layout={[{ kind: 'tabs', children: [{ field: 'firstName' }] }]}
      />,
    );
    expect(document.querySelectorAll('[role="tab"]')).toHaveLength(1);
  });

  it('badges a tab with its invalid-field count, as Angular does by default', async () => {
    render(
      <OgeForm
        defaultFormData={data()}
        layout={[{ kind: 'tabs', children: twoGroups }]}
      />,
    );
    await flush();
    expect(document.querySelector('.oge-tab-badge')?.textContent).toBe('1');
  });

  it('drops the badges when asked', async () => {
    render(
      <OgeForm
        defaultFormData={data()}
        layout={[{ kind: 'tabs', showErrorBadges: false, children: twoGroups }]}
      />,
    );
    await flush();
    expect(document.querySelector('.oge-tab-badge')).toBeNull();
  });

  it('renders every panel up front, the way a form wants its fields', () => {
    render(
      <OgeForm
        defaultFormData={data()}
        layout={[{ kind: 'tabs', children: twoGroups }]}
      />,
    );
    // deferRendering is false here — unlike the tab panel's own default
    expect(document.querySelectorAll('input')).toHaveLength(2);
  });

  it('reveals the tab holding the first invalid field before focusing it', async () => {
    const ref = createRef<OgeFormHandle>();
    render(
      <OgeForm
        ref={ref}
        defaultFormData={data()}
        scrollToFirstInvalid={false}
        layout={[
          {
            kind: 'tabs',
            children: [
              { caption: 'Contact', children: [{ field: 'email' }] },
              {
                caption: 'Personal',
                children: [{ field: 'firstName', isRequired: true }],
              },
            ],
          },
        ]}
      />,
    );
    const selected = () =>
      document.querySelector('[role="tab"][aria-selected="true"] .oge-tab-text')
        ?.textContent;
    expect(selected()).toBe('Contact');
    await act(async () => {
      ref.current?.focusFirstInvalid();
    });
    await flush();
    expect(selected()).toBe('Personal');
  });

  it('follows a controlled active index', () => {
    const onActiveIndexChange = vi.fn();
    render(
      <OgeForm
        defaultFormData={data()}
        layout={[
          {
            kind: 'tabs',
            activeIndex: 1,
            onActiveIndexChange,
            children: twoGroups,
          },
        ]}
      />,
    );
    expect(
      document.querySelector('[role="tab"][aria-selected="true"] .oge-tab-text')
        ?.textContent,
    ).toBe('Contact');
    fireEvent.click(document.querySelectorAll('[role="tab"]')[0]);
    expect(onActiveIndexChange).toHaveBeenCalledWith(0);
  });
});

describe('accordion sections', () => {
  it('renders one panel per group, all closed — Angular’s empty expandedKeys', () => {
    render(
      <OgeForm
        defaultFormData={data()}
        layout={[{ kind: 'accordion', children: twoGroups }]}
      />,
    );
    const toggles = document.querySelectorAll('.oge-accordion-toggle');
    expect(
      Array.from(toggles).map((t) =>
        t.querySelector('.oge-accordion-title')?.textContent?.trim(),
      ),
    ).toEqual(['Personal', 'Contact']);
    expect(toggles[0].getAttribute('aria-expanded')).toBe('false');
  });

  it('opens the panels defaultExpandedKeys names', () => {
    // Panels are keyed by the form's own panel id in both layers, so read the
    // id off a first render rather than guessing it — the layout is the same,
    // so the ids are too.
    const probe = render(
      <OgeForm
        defaultFormData={data()}
        layout={[{ kind: 'accordion', children: twoGroups }]}
      />,
    );
    const secondKey = document
      .querySelectorAll('.oge-accordion-toggle')[1]
      .getAttribute('data-item-id') as string;
    probe.unmount();

    render(
      <OgeForm
        defaultFormData={data()}
        layout={[
          {
            kind: 'accordion',
            defaultExpandedKeys: [secondKey],
            children: twoGroups,
          },
        ]}
      />,
    );
    const expanded = Array.from(
      document.querySelectorAll('.oge-accordion-toggle'),
    ).map((toggle) => toggle.getAttribute('aria-expanded'));
    expect(expanded).toEqual(['false', 'true']);
  });

  it('flags the panel that holds an invalid field', async () => {
    render(
      <OgeForm
        defaultFormData={data()}
        layout={[{ kind: 'accordion', children: twoGroups }]}
      />,
    );
    await flush();
    expect(document.querySelector('.oge-accordion-item-invalid')).toBeTruthy();
  });

  it('expands the panel holding the first invalid field', async () => {
    const ref = createRef<OgeFormHandle>();
    render(
      <OgeForm
        ref={ref}
        defaultFormData={data()}
        scrollToFirstInvalid={false}
        layout={[
          {
            kind: 'accordion',
            children: [
              { caption: 'Contact', children: [{ field: 'email' }] },
              {
                caption: 'Personal',
                children: [{ field: 'firstName', isRequired: true }],
              },
            ],
          },
        ]}
      />,
    );
    const expanded = () =>
      Array.from(document.querySelectorAll('.oge-accordion-toggle')).map((t) =>
        t.getAttribute('aria-expanded'),
      );
    expect(expanded()).toEqual(['false', 'false']);
    await act(async () => {
      ref.current?.focusFirstInvalid();
    });
    await flush();
    expect(expanded()).toEqual(['false', 'true']);
  });
});

describe('wizard sections', () => {
  it('renders one step per group', () => {
    render(
      <OgeForm
        defaultFormData={data()}
        layout={[{ kind: 'steps', children: twoGroups }]}
      />,
    );
    expect(document.querySelector('.oge-form-steps')).toBeTruthy();
    expect(document.querySelectorAll('.oge-stepper-header')).toHaveLength(2);
  });

  it('marks a step complete only while nothing under it is invalid', async () => {
    render(
      <OgeForm
        defaultFormData={data()}
        layout={[{ kind: 'steps', children: twoGroups }]}
      />,
    );
    await flush();
    // step 1 holds the required, still-empty field
    const states = Array.from(
      document.querySelectorAll('.oge-stepper-header'),
    ).map((header) => header.getAttribute('data-state'));
    expect(states[0]).toBe('error');
    expect(states[1]).toBe('done');
  });

  it('touches only the step being left, so the steps ahead stay quiet', async () => {
    render(
      <OgeForm
        defaultFormData={data()}
        layout={[
          {
            kind: 'steps',
            children: [
              {
                caption: 'One',
                children: [{ field: 'firstName', isRequired: true }],
              },
              {
                caption: 'Two',
                children: [{ field: 'email', isRequired: true }],
              },
            ],
          },
        ]}
      />,
    );
    await flush();
    expect(document.querySelectorAll('.oge-input-error')).toHaveLength(0);
    const next = Array.from(document.querySelectorAll('button')).find((b) =>
      /next/i.test(b.textContent ?? ''),
    );
    await act(async () => {
      fireEvent.click(next as HTMLButtonElement);
    });
    await flush();
    // exactly one error is on screen: the step the user left
    expect(document.querySelectorAll('.oge-input-error').length).toBe(1);
  });
});

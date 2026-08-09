import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { OgeForm } from './form';
import { OgeFormGroup } from './form-group';
import { OgeFormItem } from './form-item';
import { OgeFormAccordion, OgeFormTabs } from './form-sections';

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

interface Employee extends Record<string, unknown> {
  firstName: string;
  lastName: string;
  title: string;
  salary: number;
}

@Component({
  selector: 'oge-tabs-host',
  imports: [OgeForm, OgeFormItem, OgeFormGroup, OgeFormTabs],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <oge-form [(formData)]="data" [scrollToFirstInvalid]="false">
      <oge-form-tabs>
        <oge-form-group caption="Personal" [colCount]="2">
          <oge-form-item field="firstName" label="First" />
          <oge-form-item field="lastName" label="Last" />
        </oge-form-group>
        <oge-form-group caption="Employment">
          <oge-form-item field="title" label="Title" [isRequired]="true" />
          <oge-form-item field="salary" label="Salary" />
        </oge-form-group>
      </oge-form-tabs>
    </oge-form>
  `,
})
class TabsHost {
  readonly data = signal<Employee>({
    firstName: 'Ada',
    lastName: 'Lovelace',
    title: '',
    salary: 100,
  });
}

@Component({
  selector: 'oge-accordion-host',
  imports: [OgeForm, OgeFormItem, OgeFormGroup, OgeFormAccordion],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <oge-form [(formData)]="data" [scrollToFirstInvalid]="false">
      <oge-form-accordion [expandedKeys]="[]">
        <oge-form-group caption="Personal">
          <oge-form-item field="firstName" label="First" />
        </oge-form-group>
        <oge-form-group caption="Employment">
          <oge-form-item field="title" label="Title" [isRequired]="true" />
        </oge-form-group>
      </oge-form-accordion>
    </oge-form>
  `,
})
class AccordionHost {
  readonly data = signal<Employee>({
    firstName: 'Ada',
    lastName: 'Lovelace',
    title: '',
    salary: 100,
  });
}

function formOf(fixture: ComponentFixture<unknown>): OgeForm {
  return fixture.debugElement.children[0].componentInstance as OgeForm;
}

describe('OgeForm — tab sections', () => {
  it('renders one tab per group, captions becoming tab text', async () => {
    const fixture = TestBed.createComponent(TabsHost);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;

    const tabs = Array.from(el.querySelectorAll('[role="tab"]'));
    expect(
      tabs.map((t) => t.querySelector('.oge-tab-text')?.textContent?.trim()),
    ).toEqual(['Personal', 'Employment']);
  });

  it('reuses the tab panel rather than re-implementing a strip', async () => {
    const fixture = TestBed.createComponent(TabsHost);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('oge-tab-panel')).toBeTruthy();
    expect(el.querySelector('[role="tablist"]')).toBeTruthy();
  });

  it('still validates fields in a tab that is not selected', async () => {
    const fixture = TestBed.createComponent(TabsHost);
    await settle(fixture);
    // `title` lives in the second tab and is required
    expect(formOf(fixture).valid()).toBe(false);
    expect(formOf(fixture).errors()[0].field).toBe('title');
  });

  it('badges a tab with its invalid field count', async () => {
    const fixture = TestBed.createComponent(TabsHost);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    const badges = Array.from(el.querySelectorAll('.oge-tab-badge'));
    expect(badges.length).toBe(1);
    expect(badges[0].textContent?.trim()).toBe('1');
  });

  it('selects the tab holding the first invalid field on submit', async () => {
    const fixture = TestBed.createComponent(TabsHost);
    await settle(fixture);
    const form = formOf(fixture);
    expect(await form.submit()).toBe(false);
    await settle(fixture);

    const el = fixture.nativeElement as HTMLElement;
    const selected = el.querySelector('[role="tab"][aria-selected="true"]');
    expect(selected?.textContent).toContain('Employment');
  });

  it('focuses the invalid field once its tab is revealed', async () => {
    const fixture = TestBed.createComponent(TabsHost);
    await settle(fixture);
    await formOf(fixture).submit();
    await settle(fixture);
    await settle(fixture);

    const el = fixture.nativeElement as HTMLElement;
    const active = document.activeElement as HTMLElement | null;
    expect(active?.tagName).toBe('INPUT');
    expect(el.contains(active)).toBe(true);
  });
});

describe('OgeForm — accordion sections', () => {
  it('renders one panel per group', async () => {
    const fixture = TestBed.createComponent(AccordionHost);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('oge-accordion')).toBeTruthy();
    const headers = Array.from(el.querySelectorAll('.oge-accordion-header'));
    expect(headers.length).toBe(2);
  });

  it('flags the panel that holds an invalid field', async () => {
    const fixture = TestBed.createComponent(AccordionHost);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelectorAll('.oge-accordion-invalid-dot').length).toBe(1);
  });

  it('expands the panel holding the first invalid field on submit', async () => {
    const fixture = TestBed.createComponent(AccordionHost);
    await settle(fixture);
    const form = formOf(fixture);
    expect(await form.submit()).toBe(false);
    await settle(fixture);

    const el = fixture.nativeElement as HTMLElement;
    const expanded = Array.from(
      el.querySelectorAll('[aria-expanded="true"]'),
    ).map((n) => n.textContent);
    expect(expanded.length).toBe(1);
    expect(expanded[0]).toContain('Employment');
  });
});

import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { form, hidden, metadata, required } from '@angular/forms/signals';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { OgeForm } from './form';
import {
  OGE_FORM_COL_SPAN,
  OGE_FORM_EDITOR,
  OGE_FORM_EDITOR_OPTIONS,
  OGE_FORM_GROUP,
  OGE_FORM_HINT,
  OGE_FORM_LABEL,
  OGE_FORM_ORDER,
} from './metadata';

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

@Component({
  selector: 'oge-metadata-host',
  imports: [OgeForm],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <oge-form
      [fieldTree]="profile"
      [colCount]="2"
      labelLocation="start"
      [scrollToFirstInvalid]="false"
    />
  `,
})
class MetadataHost {
  readonly model = signal({
    email: '',
    bio: '',
    secret: '',
    team: 'Platform',
    name: '',
  });

  readonly profile = form(this.model, (p) => {
    required(p.email);
    metadata(p.email, OGE_FORM_LABEL, () => 'E-mail address');
    metadata(p.email, OGE_FORM_HINT, () => 'Work address, please');
    metadata(p.email, OGE_FORM_ORDER, () => 0);
    metadata(p.email, OGE_FORM_GROUP, () => 'Contact');

    metadata(p.bio, OGE_FORM_EDITOR, () => 'textArea' as const);
    metadata(p.bio, OGE_FORM_COL_SPAN, () => 2);

    metadata(p.team, OGE_FORM_EDITOR_OPTIONS, () => ({
      items: ['Platform', 'Design'],
    }));

    hidden(p.secret, () => true);
  });
}

function labels(el: HTMLElement): string[] {
  return Array.from(el.querySelectorAll('.oge-form-label')).map((n) =>
    (n.textContent ?? '').trim().replace(/\s*\*\s*required$/, ''),
  );
}

describe('OgeForm — schema-carried layout metadata', () => {
  it('generates the whole layout from the schema when nothing is declared', async () => {
    const fixture = TestBed.createComponent(MetadataHost);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    // 5 model keys, one hidden by the schema
    expect(el.querySelectorAll('oge-form-field').length).toBe(4);
  });

  it('reads OGE_FORM_LABEL, falling back to a title-cased field name', async () => {
    const fixture = TestBed.createComponent(MetadataHost);
    await settle(fixture);
    const shown = labels(fixture.nativeElement as HTMLElement);
    expect(shown).toContain('E-mail address');
    expect(shown).toContain('Name');
  });

  it('honours OGE_FORM_ORDER', async () => {
    const fixture = TestBed.createComponent(MetadataHost);
    await settle(fixture);
    // email carries order 0, so its group is laid out first
    const el = fixture.nativeElement as HTMLElement;
    const first = el.querySelector('.oge-form-fields')?.firstElementChild;
    expect(first?.tagName).toBe('FIELDSET');
  });

  it('creates a group from OGE_FORM_GROUP', async () => {
    const fixture = TestBed.createComponent(MetadataHost);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    const legend = el.querySelector('fieldset.oge-form-group > legend');
    expect(legend?.textContent?.trim()).toBe('Contact');
  });

  it('reads OGE_FORM_EDITOR and OGE_FORM_COL_SPAN', async () => {
    const fixture = TestBed.createComponent(MetadataHost);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelectorAll('oge-text-area').length).toBe(1);
    const bio = Array.from(
      el.querySelectorAll<HTMLElement>('oge-form-field'),
    ).find((f) => f.querySelector('oge-text-area'));
    expect(bio?.style.gridColumn).toBe('span 2');
  });

  it('reads OGE_FORM_EDITOR_OPTIONS', async () => {
    const fixture = TestBed.createComponent(MetadataHost);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelectorAll('oge-select-box').length).toBe(1);
  });

  it('drops a field the schema hid', async () => {
    const fixture = TestBed.createComponent(MetadataHost);
    await settle(fixture);
    expect(labels(fixture.nativeElement as HTMLElement)).not.toContain(
      'Secret',
    );
  });

  it('still validates through the caller-owned schema', async () => {
    const fixture = TestBed.createComponent(MetadataHost);
    await settle(fixture);
    const form = fixture.debugElement.children[0].componentInstance as OgeForm;
    expect(form.valid()).toBe(false);
    expect(form.errors()[0].label).toBe('E-mail address');
  });
});

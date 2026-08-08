import { demoSource } from '../../shared/demo-source';

export const SINGLE_SNIPPET = demoSource({
  use: { '@oge-ui/buttons': ['OgeButton', 'OgeButtonGroup'] },
  template: `<oge-button-group
  selectionMode="single"
  [(selectedKeys)]="align"
  ariaLabel="Text alignment"
>
  <oge-button value="left" text="Left" />
  <oge-button value="center" text="Center" />
  <oge-button value="right" text="Right" />
</oge-button-group>`,
  body: `protected readonly align = signal<string[]>(['center']);`,
});

export const MULTI_SNIPPET = demoSource({
  use: { '@oge-ui/buttons': ['OgeButton', 'OgeButtonGroup'] },
  template: `<oge-button-group
  selectionMode="multiple"
  [(selectedKeys)]="styles"
  stylingMode="outlined"
  ariaLabel="Text styles"
>
  <oge-button value="bold" text="B" hint="Bold" />
  <oge-button value="italic" text="I" hint="Italic" />
  <oge-button value="underline" text="U" hint="Underline" />
</oge-button-group>`,
  body: `protected readonly styles = signal<string[]>(['bold']);`,
});

export const ITEMS_SNIPPET = demoSource({
  use: { '@oge-ui/buttons': ['OgeButtonGroup'] },
  types: { '@oge-ui/buttons': ['OgeButtonGroupItem'] },
  template: `<oge-button-group
  selectionMode="single"
  [items]="periods"
  [(selectedKeys)]="period"
  size="sm"
  ariaLabel="Period"
/>`,
  body: `protected readonly periods: OgeButtonGroupItem[] = [
  { value: 'day', text: 'Day' },
  { value: 'week', text: 'Week' },
  { value: 'month', text: 'Month' },
  { value: 'year', text: 'Year', disabled: true },
];

protected readonly period = signal<string[]>(['week']);`,
});

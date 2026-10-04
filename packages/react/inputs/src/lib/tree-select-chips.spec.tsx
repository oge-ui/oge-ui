import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { OgeTreeSelect } from './tree-select';

interface Folder {
  id: number;
  parentId: number | null;
  name: string;
}

const FOLDERS: Folder[] = [
  { id: 1, parentId: null, name: 'Documents' },
  { id: 2, parentId: 1, name: 'Reports' },
  { id: 4, parentId: null, name: 'Photos' },
  { id: 5, parentId: 4, name: 'Holiday' },
];

function Host(props: {
  maxDisplayedTags?: number;
  onValue?: (value: unknown) => void;
}) {
  const [value, setValue] = useState<unknown>([2, 4, 5]);
  return (
    <OgeTreeSelect<Folder>
      label="Folders"
      items={FOLDERS}
      displayExpr="name"
      rootValue={null}
      selectionMode="multiple"
      selectNodesRecursive={false}
      showSelectionAs="chips"
      maxDisplayedTags={props.maxDisplayedTags}
      value={value}
      onValueChange={(next) => {
        setValue(next);
        props.onValue?.(next);
      }}
    />
  );
}

describe('<OgeTreeSelect> chips', () => {
  it('renders the selection as chips with an empty field text', () => {
    render(<Host />);
    expect(document.querySelector('.oge-tree-select')).toHaveClass(
      'oge-tree-select-chips',
    );
    expect(
      Array.from(document.querySelectorAll('.oge-tag-text')).map(
        (el) => el.textContent,
      ),
    ).toEqual(['Reports', 'Photos', 'Holiday']);
    expect((screen.getByRole('combobox') as HTMLInputElement).value).toBe('');
  });

  it('removes a node from its chip and from Backspace', () => {
    const onValue = vi.fn();
    render(<Host onValue={onValue} />);
    fireEvent.click(screen.getByRole('button', { name: 'Remove Reports' }));
    expect(onValue).toHaveBeenLastCalledWith([4, 5]);
    fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Backspace' });
    expect(onValue).toHaveBeenLastCalledWith([4]);
  });

  it('folds chips past maxDisplayedTags into "+N more"', () => {
    render(<Host maxDisplayedTags={1} />);
    expect(document.querySelector('.oge-tag-more')?.textContent).toBe(
      '+2 more',
    );
  });
});

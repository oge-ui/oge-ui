import { StrictMode } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { OgeAvatar, OgeAvatarGroup } from './avatar';
import { OgeAvatarConfigProvider } from './layout-config';

const host = () => document.querySelector('.oge-avatar') as HTMLElement;

describe('<OgeAvatar>', () => {
  it('is a named img with derived initials and the preset classes', () => {
    render(
      <OgeAvatar name="Ada Lovelace" size="lg" shape="rounded" className="x" />,
    );
    const el = screen.getByRole('img', { name: 'Ada Lovelace' });
    expect(el.querySelector('.oge-avatar-initials')?.textContent).toBe('AL');
    expect(el.className).toContain('oge-avatar-lg');
    expect(el.className).toContain('oge-avatar-rounded');
    expect(el.className).toContain('oge-avatar-type-initials');
    expect(el.className).toContain('x');
  });

  it('runs the image → initials → icon fallback chain', () => {
    const failed = vi.fn();
    const { rerender } = render(
      <OgeAvatar name="Ada Lovelace" src="broken.png" onImageFailed={failed} />,
    );
    const img = host().querySelector('img') as HTMLImageElement;
    expect(img.getAttribute('alt')).toBe('');
    fireEvent.error(img);
    expect(host().querySelector('img')).toBeNull();
    expect(host().querySelector('.oge-avatar-initials')).not.toBeNull();
    expect(failed).toHaveBeenCalledWith(
      expect.objectContaining({ src: 'broken.png' }),
    );
    rerender(<OgeAvatar name="Ada Lovelace" src="other.png" />);
    expect(host().querySelector('img')).not.toBeNull();
    rerender(<OgeAvatar />);
    expect(
      host().querySelector('.oge-avatar-icon path')?.getAttribute('d'),
    ).toMatch(/^M/);
    expect(screen.getByRole('img', { name: 'Avatar' })).toBeTruthy();
  });

  it('sanitizes the image URL', () => {
    render(<OgeAvatar name="X" src="javascript:alert(1)" />);
    expect(host().querySelector('img')?.getAttribute('src')).not.toContain(
      'javascript',
    );
  });

  it('appends the presence and supports decorative avatars', () => {
    const { rerender } = render(
      <OgeAvatar name="Ada Lovelace" status="away" />,
    );
    expect(
      screen.getByRole('img', { name: 'Ada Lovelace (Away)' }),
    ).toBeTruthy();
    expect(
      host()
        .querySelector('.oge-avatar-status-away')
        ?.getAttribute('aria-hidden'),
    ).toBe('true');
    rerender(<OgeAvatar name="Ada Lovelace" decorative />);
    expect(host().hasAttribute('role')).toBe(false);
    expect(host().getAttribute('aria-hidden')).toBe('true');
  });

  it('reads defaults, messages and locale from the provider', () => {
    render(
      <OgeAvatarConfigProvider
        config={{ size: 'xs', locale: 'tr', messages: { busy: 'Meşgul' } }}
      >
        <OgeAvatar name="ilker irmak" status="busy" />
      </OgeAvatarConfigProvider>,
    );
    const el = screen.getByRole('img', { name: 'ilker irmak (Meşgul)' });
    expect(el.className).toContain('oge-avatar-xs');
    expect(el.textContent).toBe('İİ');
  });
});

describe('<OgeAvatarGroup>', () => {
  it('collapses the surplus into +N and names the group', () => {
    render(
      <OgeAvatarGroup
        items={[
          { key: 1, name: 'Ada Lovelace' },
          { key: 2, name: 'Grace Hopper' },
        ]}
        max={3}
        size="sm"
        ariaLabel="Team"
      >
        <OgeAvatar name="Alan Turing" />
        <OgeAvatar name="Edsger Dijkstra" />
      </OgeAvatarGroup>,
    );
    const group = screen.getByRole('group', { name: 'Team' });
    const names = Array.from(group.querySelectorAll('[role="img"]')).map((el) =>
      el.getAttribute('aria-label'),
    );
    expect(names).toEqual(['Ada Lovelace', 'Grace Hopper', '2 more']);
    expect(group.querySelector('.oge-avatar-overflow')?.textContent).toBe('+2');
    expect(group.querySelector('.oge-avatar')?.className).toContain(
      'oge-avatar-sm',
    );
  });

  it('shows projected children within the window and adds a total', () => {
    render(
      <OgeAvatarGroup items={[{ name: 'Ada Lovelace' }]} max={4} total={10}>
        <OgeAvatar name="Alan Turing" />
        <OgeAvatar name="Edsger Dijkstra" />
      </OgeAvatarGroup>,
    );
    expect(screen.getByRole('img', { name: 'Edsger Dijkstra' })).toBeTruthy();
    expect(screen.getByRole('img', { name: '7 more' })).toBeTruthy();
    expect(
      document.querySelector('.oge-avatar-group')?.hasAttribute('role'),
    ).toBe(false);
  });

  it('survives a StrictMode double mount', () => {
    render(
      <StrictMode>
        <OgeAvatarGroup items={[{ name: 'Ada Lovelace', status: 'online' }]} />
      </StrictMode>,
    );
    expect(
      screen.getByRole('img', { name: 'Ada Lovelace (Online)' }),
    ).toBeTruthy();
  });
});

import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('renders the brand and, on the landing route, only the header nav', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('header a')?.textContent).toContain('OGE');
    // '/' is the full-bleed landing: header links only, no docs sidebar
    expect(compiled.querySelectorAll('header nav a').length).toBe(2);
    expect(
      compiled.querySelector('nav[aria-label="Documentation"]'),
    ).toBeNull();
  });
});

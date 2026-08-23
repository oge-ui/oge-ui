import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';

// React Testing Library does not auto-clean under vitest's `globals: true`
// unless the afterEach is registered explicitly.
afterEach(() => cleanup());

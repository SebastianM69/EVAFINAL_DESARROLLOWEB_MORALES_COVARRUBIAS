import { describe, expect, it } from 'vitest';

import { resolveMediaUrl } from './api-client';

describe('resolveMediaUrl', () => {
  it('resolves public media paths against the API origin', () => {
    expect(resolveMediaUrl('/media/products/image.webp')).toBe(
      'http://localhost:3000/media/products/image.webp',
    );
  });
});

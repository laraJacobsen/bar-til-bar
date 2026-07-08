import { describe, it, expect } from 'vitest';
import { nextRotation, swapsDimensions, type Rotation } from '@/lib/image';

// Pure rotation math — no canvas/DOM, so this runs without the Firebase emulator or a browser.
describe('rotation math', () => {
  it('cycles 0 -> 90 -> 180 -> 270 -> 0', () => {
    let r: Rotation = 0;
    r = nextRotation(r); expect(r).toBe(90);
    r = nextRotation(r); expect(r).toBe(180);
    r = nextRotation(r); expect(r).toBe(270);
    r = nextRotation(r); expect(r).toBe(0);
  });

  it('swaps dimensions only for 90 and 270', () => {
    expect(swapsDimensions(0)).toBe(false);
    expect(swapsDimensions(90)).toBe(true);
    expect(swapsDimensions(180)).toBe(false);
    expect(swapsDimensions(270)).toBe(true);
  });
});

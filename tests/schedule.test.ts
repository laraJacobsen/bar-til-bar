import { describe, expect, it } from 'vitest';
import { generateGroupBarSequences } from '@/lib/group';

// Regression guard for the "keeps challenges from the previous bar" bug: the route
// generator must give every group a route that visits every bar EXACTLY once. The old
// circle-method version skipped some bars and repeated others (e.g. [1,2,2]), so a group
// whose route revisited a bar stayed stuck on that bar's challenges when advancing.
describe('generateGroupBarSequences', () => {
  const cases: Array<[number, number]> = [
    [1, 4], [2, 2], [3, 3], [4, 3], [5, 5], [6, 6], [3, 5], [8, 4],
  ];

  for (const [groups, bars] of cases) {
    it(`${groups} groups × ${bars} bars → each group visits each bar exactly once`, () => {
      const seqs = generateGroupBarSequences(groups, bars);
      expect(seqs).toHaveLength(groups);
      for (const seq of seqs) {
        expect(seq).toHaveLength(bars);
        // A permutation of [0..bars-1]: no duplicate stop, no skipped stop.
        expect(new Set(seq).size).toBe(bars);
        expect(Math.min(...seq)).toBe(0);
        expect(Math.max(...seq)).toBe(bars - 1);
      }
    });
  }

  it('returns [] for degenerate inputs', () => {
    expect(generateGroupBarSequences(0, 4)).toEqual([]);
    expect(generateGroupBarSequences(3, 0)).toEqual([]);
  });
});

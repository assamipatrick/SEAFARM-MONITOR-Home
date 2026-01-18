
declare var describe: any;
declare var it: any;
declare var expect: any;

import { calculateSGR, dmsToDd } from '../converters';

describe('Converter Utilities', () => {

    describe('calculateSGR (Specific Growth Rate)', () => {
        it('should calculate positive growth correctly', () => {
            // Initial: 10kg, Final: 20kg, Days: 10
            // Formula: (ln(20) - ln(10)) / 10 * 100
            // (2.9957 - 2.3025) / 10 * 100 = 0.0693 * 100 = 6.93%
            const result = calculateSGR(10, 20, 10);
            expect(result).toBe(6.93);
        });

        it('should return 0 or negative for no growth/loss', () => {
            expect(calculateSGR(10, 10, 10)).toBe(0);
            const lossResult = calculateSGR(20, 10, 10);
            expect(lossResult).toBeLessThan(0); // Should be approx -6.93
        });

        it('should return null for invalid inputs', () => {
            expect(calculateSGR(0, 10, 10)).toBeNull(); // Initial weight 0
            expect(calculateSGR(10, 0, 10)).toBeNull(); // Final weight 0
            expect(calculateSGR(10, 20, 0)).toBeNull(); // 0 days
        });
    });

    describe('dmsToDd (Coordinates)', () => {
        it('should convert DMS string to Decimal Degrees', () => {
            // 18° 45' 0" S => -18.75
            const result = dmsToDd(`18° 45' 0" S`);
            expect(result).toBe(-18.75);
        });

        it('should handle simple decimal inputs passed as strings', () => {
            expect(dmsToDd("-18.75")).toBe(-18.75);
        });

        it('should throw error on invalid format', () => {
            expect(() => dmsToDd("Not a coordinate")).toThrow();
        });
    });
});

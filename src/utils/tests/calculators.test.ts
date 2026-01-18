
declare var describe: any;
declare var it: any;
declare var expect: any;

import { calculateNetWeight, calculateDurationDays } from '../calculators';

describe('Calculator Utilities', () => {
    
    describe('calculateNetWeight', () => {
        it('should correctly subtract cuttings from gross weight', () => {
            const result = calculateNetWeight(100, 20);
            expect(result).toBe(80);
        });

        it('should return 0 if cuttings exceed gross weight (negative result prevention)', () => {
            const result = calculateNetWeight(50, 60);
            expect(result).toBe(0);
        });

        it('should handle null or undefined inputs as 0', () => {
            expect(calculateNetWeight(null, 10)).toBe(0);
            expect(calculateNetWeight(100, undefined)).toBe(100);
            expect(calculateNetWeight(undefined, null)).toBe(0);
        });

        it('should handle floating point numbers', () => {
            const result = calculateNetWeight(10.5, 2.2);
            expect(result).toBeCloseTo(8.3);
        });
    });

    describe('calculateDurationDays', () => {
        it('should calculate days between two dates correctly', () => {
            const start = '2023-01-01';
            const end = '2023-01-10';
            expect(calculateDurationDays(start, end)).toBe(9);
        });

        it('should return 0 for invalid dates', () => {
            expect(calculateDurationDays('invalid', '2023-01-01')).toBe(0);
        });
    });
});

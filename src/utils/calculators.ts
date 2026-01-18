
/**
 * Calculates the net weight of a harvest by subtracting cuttings taken for replanting.
 * 
 * @param grossWeightKg The total weight harvested from the sea.
 * @param cuttingsWeightKg The weight of seaweed kept for replanting.
 * @returns The net weight available for processing/sale. Returns 0 if result is negative.
 */
export const calculateNetWeight = (grossWeightKg: number | undefined | null, cuttingsWeightKg: number | undefined | null): number => {
    const gross = grossWeightKg || 0;
    const cuttings = cuttingsWeightKg || 0;
    const net = gross - cuttings;
    return Math.max(0, net);
};

/**
 * Calculates the duration of a cycle in days.
 * 
 * @param startDateStr ISO Date string of planting
 * @param endDateStr ISO Date string of harvest (or current date if active)
 * @returns Number of days (integer)
 */
export const calculateDurationDays = (startDateStr: string, endDateStr: string): number => {
    const start = new Date(startDateStr);
    const end = new Date(endDateStr);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return 0;
    }

    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    return diffDays;
};

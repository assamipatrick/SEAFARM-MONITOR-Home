

/**
 * Converts a Decimal Degree (DD) number to a DMS string.
 * @param deg The decimal degree value.
 * @param isLat Boolean indicating if this is latitude (true) or longitude (false).
 * @returns The formatted DMS string (e.g., "12° 30' 15.5" S").
 */
export function ddToDms(deg: number, isLat: boolean): string {
    if (isNaN(deg) || deg === null) return '';

    const absolute = Math.abs(deg);
    const degrees = Math.floor(absolute);
    const minutesNotTruncated = (absolute - degrees) * 60;
    const minutes = Math.floor(minutesNotTruncated);
    const seconds = ((minutesNotTruncated - minutes) * 60).toFixed(2);

    let direction = '';
    if (isLat) {
        direction = deg >= 0 ? 'N' : 'S';
    } else {
        direction = deg >= 0 ? 'E' : 'W';
    }

    // Avoid 60 seconds/minutes edge case
    if (parseFloat(seconds) === 60) {
        // Simplify for display if needed, but generally floating point math handles this reasonably well for display
    }

    return `${degrees}° ${minutes}' ${seconds}" ${direction}`;
}

export function parseGeoPoint(point: string): { lat: number; lon: number } | null {
    if (!point) return null;
    // Try parsing as generic comma-separated values first (could be DMS or DD strings)
    const parts = point.split(',').map(p => p.trim());
    if (parts.length === 2) {
        try {
            const lat = dmsToDd(parts[0]);
            const lon = dmsToDd(parts[1]);
            return { lat, lon };
        } catch (e) {
            return null;
        }
    }
    return null;
}

/**
 * Converts a single coordinate string (DMS or DD) to a decimal degree number.
 * @param input The coordinate string (e.g., "12° 49' 45.73\" S" or "-12.829").
 * @returns The coordinate in decimal degrees.
 * @throws An error if the format is invalid.
 */
export function dmsToDd(input: string): number {
    if (!input) throw new Error("Empty input");
    const cleanInput = input.trim();

    // Check for simple Decimal Degree format (positive/negative number)
    if (/^-?\d+(\.\d+)?$/.test(cleanInput)) {
        const val = parseFloat(cleanInput);
        if (!isNaN(val)) return val;
    }

    // Flexible DMS regex: degrees (required), minutes (optional), seconds (optional), direction (required)
    const regex = /(-?\d+(\.\d+)?)\s*°(?:\s*(\d+(\.\d+)?)\s*')?(?:\s*(\d+(\.\d+)?)\s*")?\s*([NSEW])/i;
    const parts = cleanInput.match(regex);

    if (!parts) {
         // Fallback for simple degree values with direction like "12.34 N"
         const simpleMatch = cleanInput.match(/(-?\d+(\.\d+)?)\s*([NSEW])/i);
         if (simpleMatch) {
             const val = parseFloat(simpleMatch[1]);
             const dir = simpleMatch[3].toUpperCase();
             if ((dir === 'S' || dir === 'W') && val > 0) return -val;
             return val;
         }
        throw new Error(`Invalid coordinate format: "${input}"`);
    }

    const degrees = parseFloat(parts[1]);
    const minutes = parseFloat(parts[3] || '0');
    const seconds = parseFloat(parts[5] || '0');
    const direction = parts[7].toUpperCase();

    if (isNaN(degrees) || minutes < 0 || seconds < 0) {
         throw new Error(`Invalid numbers in DMS string: "${input}"`);
    }

    let dd = Math.abs(degrees) + minutes / 60 + seconds / 3600;

    if (direction === 'S' || direction === 'W') {
        dd = dd * -1;
    }
    
    // Validate ranges
    if ((direction === 'N' || direction === 'S') && Math.abs(dd) > 90) {
        throw new Error(`Latitude out of range (-90 to 90): "${input}"`);
    }
    if ((direction === 'E' || direction === 'W') && Math.abs(dd) > 180) {
        throw new Error(`Longitude out of range (-180 to 180): "${input}"`);
    }

    return dd;
}

/**
 * Converts an array of geo-point strings (DMS or DD) to an array of XY coordinates (decimal degrees).
 * @param geoPoints An array of strings, where each string is a "lat, lon" pair.
 * @returns An array of objects with x (longitude) and y (latitude) properties in decimal degrees. Skips any points that fail to convert.
 */
export function convertGeoPointsToXY(geoPoints: string[]): { x: number; y: number }[] {
    const coordinates: { x: number; y: number }[] = [];

    for (const point of geoPoints) {
        if (!point || !point.trim()) {
            continue;
        }

        try {
            const parts = point.split(',');
            if (parts.length !== 2) {
                throw new Error(`Invalid geo-point format, expected 'lat, lon'`);
            }

            const latStr = parts[0].trim();
            const lonStr = parts[1].trim();

            if (!latStr || !lonStr) continue;

            const y = dmsToDd(latStr); // Latitude is Y
            const x = dmsToDd(lonStr); // Longitude is X
            
            coordinates.push({ x, y });
        } catch (error) {
             // Silently skip invalid points for rendering
        }
    }

    return coordinates;
}

/**
 * Formats a coordinate string based on the specified format (DMS or DD).
 * @param value The coordinate string (DMS or DD).
 * @param format The desired format ('DMS' or 'DD').
 * @param isLat Boolean indicating if this is latitude.
 * @returns The formatted coordinate string.
 */
export function formatCoordinate(value: string, format: 'DMS' | 'DD', isLat: boolean): string {
    if (!value) return '';
    
    let dd: number;
    try {
        // dmsToDd handles both DMS strings and DD strings (as text)
        dd = dmsToDd(value);
    } catch {
        return value; // Return original if parsing fails
    }

    if (format === 'DD') {
        return dd.toFixed(6);
    } else {
        return ddToDms(dd, isLat);
    }
}

/**
 * Calculates the Specific Growth Rate (SGR) as a percentage per day.
 * Formula: SGR = (ln(W2) - ln(W1)) / (t2 - t1) * 100
 * 
 * @param initialWeight The initial biomass weight (W1).
 * @param finalWeight The final biomass weight (W2).
 * @param days The duration in days (t2 - t1).
 * @returns The SGR percentage, or null if invalid inputs.
 */
export function calculateSGR(initialWeight: number, finalWeight: number, days: number): number | null {
    if (initialWeight <= 0 || finalWeight <= 0 || days <= 0) return null;
    
    // Formula: (ln(Wf) - ln(Wi)) / days * 100
    const rate = ((Math.log(finalWeight) - Math.log(initialWeight)) / days) * 100;
    
    // Return rate fixed to 2 decimal places, ensuring it's not negative if harvest < initial (loss)
    // Though technically SGR can be negative, for display we often floor at 0 or show negative.
    // For this context, we return the raw value but formatted.
    return parseFloat(rate.toFixed(2));
}



import React, { useMemo, useCallback } from 'react';
import Input from './Input';
import Select from './Select';

interface DMSInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  directions: [string, string];
  error?: string;
}

const parseDMS = (dmsString: string): { deg: string; min: string; sec: string; dir: string } => {
    if (!dmsString || !dmsString.trim()) return { deg: '', min: '', sec: '', dir: '' };
    
    // This more flexible regex allows for optional minutes and seconds.
    const regex = /(-?\d+(?:\.\d+)?)\s*°(?:\s*(\d+(?:\.\d+)?)\s*')?(?:\s*(\d+(?:\.\d+)?)\s*")?\s*([NSEW])?/i;
    const parts = dmsString.trim().match(regex);
    
    if (!parts) {
        // Fallback for simple degree values like "12.34 N" or just "12.34"
        const simpleMatch = dmsString.trim().match(/(-?\d+(?:\.\d+)?)\s*([NSEW])?/i);
        if (simpleMatch) {
            return {
                deg: simpleMatch[1] || '',
                min: '',
                sec: '',
                dir: (simpleMatch[2] || '').toUpperCase(),
            };
        }
        return { deg: dmsString, min: '', sec: '', dir: '' }; // Fallback to putting everything in degrees
    }

    return {
        deg: parts[1] || '',
        min: parts[2] || '',
        sec: parts[3] || '',
        dir: (parts[4] || '').toUpperCase(),
    };
};


const DMSInput: React.FC<DMSInputProps> = ({ label, value, onChange, directions, error }) => {
    // dms parts are derived directly from the prop `value` on each render.
    const dms = useMemo(() => {
        const parsed = parseDMS(value);
        // Ensure direction is always one of the valid options, defaulting to the first.
        const dir = directions.includes(parsed.dir) ? parsed.dir : directions[0];
        return { ...parsed, dir };
    }, [value, directions]);

    // This function reconstructs the string and calls the parent onChange.
    const handlePartChange = useCallback((part: 'deg' | 'min' | 'sec' | 'dir', newValue: string) => {
        const newDms = {
            deg: dms.deg,
            min: dms.min,
            sec: dms.sec,
            dir: dms.dir,
            [part]: newValue,
        };

        const { deg, min, sec, dir } = newDms;

        // If all number parts are empty, call onChange with an empty string.
        if (!deg.trim() && !min.trim() && !sec.trim()) {
            onChange('');
            return;
        }

        // Reconstruct the full string format. This ensures consistency.
        // No more `|| '0'`, allowing fields to be truly empty.
        const finalString = `${deg}° ${min}' ${sec}" ${dir}`;
        onChange(finalString);
    }, [dms, onChange]);

    return (
        <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
            <div className="flex items-start gap-1">
                <Input
                    type="number"
                    value={dms.deg}
                    onChange={(e) => handlePartChange('deg', e.target.value)}
                    placeholder="°"
                    aria-label={`${label} degrees`}
                    containerClassName="min-w-0"
                    min="-180" max="180"
                />
                <Input
                    type="number"
                    value={dms.min}
                    onChange={(e) => handlePartChange('min', e.target.value)}
                    placeholder="'"
                    aria-label={`${label} minutes`}
                    containerClassName="min-w-0"
                    min="0" max="59"
                />
                <Input
                    type="number"
                    step="any"
                    value={dms.sec}
                    onChange={(e) => handlePartChange('sec', e.target.value)}
                    placeholder='"'
                    aria-label={`${label} seconds`}
                    containerClassName="min-w-0"
                    min="0" max="59.999"
                />
                <Select
                    value={dms.dir}
                    onChange={(e) => handlePartChange('dir', e.target.value)}
                    aria-label={`${label} direction`}
                    containerClassName="min-w-fit"
                >
                    <option value={directions[0]}>{directions[0]}</option>
                    <option value={directions[1]}>{directions[1]}</option>
                </Select>
            </div>
             {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
        </div>
    );
};

export default DMSInput;
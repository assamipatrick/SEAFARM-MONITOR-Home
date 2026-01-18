
import React, { useEffect, useState } from 'react';
import { useSettings } from '../../contexts/SettingsContext';
import { useLocalization } from '../../contexts/LocalizationContext';
import DMSInput from './DMSInput';
import Input from './Input';
import { dmsToDd, ddToDms } from '../../utils/converters';

interface CoordinateInputProps {
    label: string;
    value: string; // The raw value stored in state (could be DMS string or DD string)
    onChange: (value: string) => void;
    axis: 'lat' | 'lon'; // 'lat' or 'lon'
    error?: string;
}

const CoordinateInput: React.FC<CoordinateInputProps> = ({ label, value, onChange, axis, error }) => {
    const { settings } = useSettings();
    const { t } = useLocalization();
    const format = settings.localization.coordinateFormat; // 'DMS' or 'DD'
    const isLat = axis === 'lat';

    // Local state for the simple input to allow typing freely before validation/conversion
    // For DMSInput, it manages its own state internally and calls onChange with a valid string.
    const [inputValue, setInputValue] = useState(value);

    // Sync internal state when prop value changes or format changes
    useEffect(() => {
        if (format === 'DD') {
            try {
                // Try to convert stored value to DD for display
                const dd = dmsToDd(value);
                setInputValue(String(dd));
            } catch {
                // If it fails (empty or invalid), just show as is if it looks like a number, else empty
                setInputValue(value);
            }
        } else {
             // Format is DMS
             try {
                // If value is a plain number string (DD), convert to DMS
                if (/^-?\d+(\.\d+)?$/.test(value)) {
                    setInputValue(ddToDms(parseFloat(value), isLat));
                } else {
                    setInputValue(value);
                }
             } catch {
                 setInputValue(value);
             }
        }
    }, [value, format, isLat]);

    const handleDDChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newVal = e.target.value;
        setInputValue(newVal);
        onChange(newVal); // We pass the DD string directly up
    };

    if (format === 'DMS') {
        const directions: [string, string] = isLat ? ['N', 'S'] : ['E', 'W'];
        return (
            <DMSInput 
                label={label} 
                value={inputValue} 
                onChange={onChange} 
                directions={directions} 
                error={error} 
            />
        );
    }

    // Decimal Degrees (DD) View
    return (
        <Input
            label={`${label} (DD)`}
            type="number"
            step="any"
            value={inputValue}
            onChange={handleDDChange}
            error={error}
            placeholder={isLat ? "-18.1234" : "46.5678"}
        />
    );
};

export default CoordinateInput;

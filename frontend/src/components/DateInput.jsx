import React, { useRef } from 'react';
import { formatDate } from '../utils/dateUtils';
import { Calendar } from 'lucide-react';

const DateInput = ({
    value,
    onChange,
    min,
    max,
    required,
    placeholder = "DD-MM-YYYY",
    className,
    style
}) => {
    const dateInputRef = useRef(null);

    const handleContainerClick = () => {
        // Try standard showPicker if supported
        if (dateInputRef.current && typeof dateInputRef.current.showPicker === 'function') {
            dateInputRef.current.showPicker();
        } else if (dateInputRef.current) {
            // Fallback: try focusing (might not open picker on all browsers)
            dateInputRef.current.focus();
            dateInputRef.current.click();
        }
    };

    return (
        <div
            style={{ position: 'relative', width: '100%', cursor: 'pointer' }}
            onClick={handleContainerClick}
        >
            <input
                type="text"
                value={value ? formatDate(value) : ''}
                placeholder={placeholder}
                readOnly
                required={required}
                className={className}
                style={{
                    ...style,
                    cursor: 'pointer',
                    paddingRight: '40px', // Space for icon
                    width: '100%'
                }}
            />

            {/* Calendar Icon - Visual Indicator */}
            <Calendar
                size={18}
                style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#666',
                    pointerEvents: 'none'
                }}
            />

            {/* Hidden Date Input for Native Picker */}
            <input
                type="date"
                ref={dateInputRef}
                value={value}
                min={min}
                max={max}
                onChange={(e) => onChange(e.target.value)}
                style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    opacity: 0,
                    cursor: 'pointer',
                    zIndex: 1 // Ensure it sits on top for clicks if showPicker fails/is not supported
                }}
                tabIndex={-1}
            />
        </div>
    );
};

export default DateInput;

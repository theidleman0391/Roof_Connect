
export type NavItem = 'script' | 'appt' | 'schedule' | 'callbacks' | 'settings' | 'registry';

export interface QualificationState {
    roofAge: string | null;
    leaks: boolean | null;
}

export interface SidebarProps {
    active: NavItem;
}

// --- Dynamic Form Engine Types ---

export type FieldType = 'text' | 'number' | 'tel' | 'email' | 'select' | 'textarea' | 'slider' | 'date' | 'url';

export interface ConditionalLogic {
    fieldId: string;
    value: string | number | boolean;
}

export interface FormField {
    id: string;
    type: FieldType;
    label: string;
    required?: boolean;
    options?: string[]; // For select inputs
    min?: number; // For slider/number
    max?: number;
    step?: number;
    showWhen?: ConditionalLogic; // Conditional visibility
    prefix?: string; // Clipboard prefix
    suffix?: string; // Clipboard suffix
    placeholder?: string;
}

export interface AppointmentRecord {
    id: string;
    createdAt: number;
    // We store the raw form data for future editing/reference
    formData: Record<string, any>;
    // We store the generated clipboard text specifically because the user might edit it manually
    clipboardSummary: string;
}

// --- Scheduling Types ---

export interface BlockRule {
    id: string;
    date: string; // YYYY-MM-DD
    time?: string; // Optional: if null, blocks entire day
    state?: string; // Optional: if null, blocks for all states
    reason?: string;
}

export const STATE_CONFIG: Record<string, { capacity: number; workdays: number[] }> = {
    'GA': { capacity: 9, workdays: [1, 2, 3, 4, 5, 6] }, // Mon-Sat
    'TN': { capacity: 9, workdays: [1, 2, 3, 4, 5, 6] },
    'AL': { capacity: 2, workdays: [1, 2, 3, 4, 5] },    // Mon-Fri
    'SC': { capacity: 1, workdays: [1, 2, 3, 4, 5] },    // Mon-Fri
};

export const OPERATING_HOURS = [
    '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
    '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM'
];

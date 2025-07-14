interface User {
    id: string;
    username: string;
    email: string;
    trial_start_date?: string; // YYYY-MM-DD
    invoices_created?: number;
    // ... other user fields
}
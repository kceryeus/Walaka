class RecurringInvoiceManager {
    constructor() {
        this.schedules = new Map();
    }

    async createSchedule(invoiceTemplate, schedule) {
        const recurringData = {
            template_id: invoiceTemplate.id,
            frequency: schedule.frequency, // weekly, monthly, quarterly, yearly
            start_date: schedule.startDate,
            end_date: schedule.endDate,
            next_date: schedule.startDate,
            active: true
        };

        const { data, error } = await supabase
            .from('recurring_invoices')
            .insert([recurringData]);

        if (error) throw error;
        return data;
    }

    async generateNextInvoice(scheduleId) {
        const schedule = await this.getSchedule(scheduleId);
        if (!schedule) return null;

        // Generate new invoice from template
        const invoice = await this.createFromTemplate(schedule.template_id);
        
        // Update next generation date
        await this.updateNextDate(scheduleId);

        return invoice;
    }
}

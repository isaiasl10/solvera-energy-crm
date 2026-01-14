import { supabase } from './supabase';

const fmt = (n?: number | null, opts?: Intl.NumberFormatOptions) =>
  (typeof n === "number" && Number.isFinite(n))
    ? n.toLocaleString(undefined, opts)
    : "—";

type ActivityLogParams = {
  customerId: string;
  userId: string;
  actionType: 'create' | 'update' | 'status_change' | 'document_upload' | 'appointment_scheduled' | 'other';
  description: string;
  fieldName?: string;
  oldValue?: string;
  newValue?: string;
};

export async function logActivity(params: ActivityLogParams): Promise<void> {
  try {
    const { error } = await supabase
      .from('project_activity_log')
      .insert([
        {
          customer_id: params.customerId,
          user_id: params.userId,
          action_type: params.actionType,
          field_name: params.fieldName || null,
          old_value: params.oldValue || null,
          new_value: params.newValue || null,
          description: params.description,
        },
      ]);

    if (error) {
      console.error('Error logging activity:', error);
    }
  } catch (error) {
    console.error('Error logging activity:', error);
  }
}

export function formatFieldName(fieldName: string): string {
  return fieldName
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function formatValue(value: any): string {
  if (value === null || value === undefined) return 'None';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return fmt(value);
  if (typeof value === 'string') {
    if (value.match(/^\d{4}-\d{2}-\d{2}/)) {
      const date = new Date(value);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    }
    return value;
  }
  return String(value);
}

export async function logCustomerUpdate(
  customerId: string,
  userId: string,
  fieldName: string,
  oldValue: any,
  newValue: any
): Promise<void> {
  const formattedFieldName = formatFieldName(fieldName);
  const formattedOldValue = formatValue(oldValue);
  const formattedNewValue = formatValue(newValue);

  const description = `Updated ${formattedFieldName} from "${formattedOldValue}" to "${formattedNewValue}"`;

  await logActivity({
    customerId,
    userId,
    actionType: 'update',
    description,
    fieldName,
    oldValue: formattedOldValue,
    newValue: formattedNewValue,
  });
}

export async function logCustomerCreation(
  customerId: string,
  userId: string,
  customerName: string
): Promise<void> {
  await logActivity({
    customerId,
    userId,
    actionType: 'create',
    description: `Created customer profile for ${customerName}`,
  });
}

export async function logStatusChange(
  customerId: string,
  userId: string,
  oldStatus: string,
  newStatus: string
): Promise<void> {
  await logActivity({
    customerId,
    userId,
    actionType: 'status_change',
    description: `Changed project status from "${oldStatus}" to "${newStatus}"`,
    fieldName: 'status',
    oldValue: oldStatus,
    newValue: newStatus,
  });
}

export async function logDocumentUpload(
  customerId: string,
  userId: string,
  documentType: string,
  fileName: string
): Promise<void> {
  await logActivity({
    customerId,
    userId,
    actionType: 'document_upload',
    description: `Uploaded ${documentType}: ${fileName}`,
    fieldName: 'document',
    newValue: fileName,
  });
}

export async function logAppointmentScheduled(
  customerId: string,
  userId: string,
  appointmentType: string,
  scheduledDate: string
): Promise<void> {
  const formattedDate = formatValue(scheduledDate);
  await logActivity({
    customerId,
    userId,
    actionType: 'appointment_scheduled',
    description: `Scheduled ${appointmentType} appointment for ${formattedDate}`,
    fieldName: 'appointment',
    newValue: formattedDate,
  });
}

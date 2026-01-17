export interface InvoiceLineItem {
  description: string;
  quantity?: number;
  unitPrice?: number;
  amount: number;
}

export interface InvoiceData {
  invoiceNumber: string;
  invoiceDate: string;
  dueDate?: string;

  billTo: {
    name: string;
    address: string;
    phone?: string;
    email?: string;
  };

  billFrom: {
    name: string;
    address: string;
    phone?: string;
    email?: string;
  };

  lineItems: InvoiceLineItem[];

  subtotal: number;
  tax?: number;
  taxRate?: number;
  total: number;

  notes?: string;
  terms?: string;

  paymentInfo?: {
    method?: string;
    checkNumber?: string;
    paidDate?: string;
  };
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function calculateInvoiceTotal(lineItems: InvoiceLineItem[]): number {
  return lineItems.reduce((sum, item) => sum + item.amount, 0);
}

export function applyTax(subtotal: number, taxRate: number): number {
  return subtotal * (taxRate / 100);
}

export function generateInvoiceNumber(prefix: string = 'INV'): string {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `${prefix}-${dateStr}-${random}`;
}

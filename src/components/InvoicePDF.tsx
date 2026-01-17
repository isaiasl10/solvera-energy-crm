import React, { useRef } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { InvoiceData, formatCurrency, formatDate } from '../lib/invoiceGenerator';
import { FileDown } from 'lucide-react';

interface InvoicePDFProps {
  invoiceData: InvoiceData;
  onGenerate?: () => void;
}

export default function InvoicePDF({ invoiceData, onGenerate }: InvoicePDFProps) {
  const invoiceRef = useRef<HTMLDivElement>(null);

  const generatePDF = async () => {
    if (!invoiceRef.current) return;

    try {
      const canvas = await html2canvas(invoiceRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`${invoiceData.invoiceNumber}.pdf`);

      if (onGenerate) onGenerate();
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  };

  return (
    <div className="space-y-4">
      <button
        onClick={generatePDF}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        <FileDown className="w-4 h-4" />
        Download PDF
      </button>

      <div
        ref={invoiceRef}
        className="bg-white p-8 rounded-lg shadow-lg border border-gray-200"
        style={{ width: '210mm', minHeight: '297mm' }}
      >
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">INVOICE</h1>
            <p className="text-sm text-gray-600">#{invoiceData.invoiceNumber}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Date: {formatDate(invoiceData.invoiceDate)}</p>
            {invoiceData.dueDate && (
              <p className="text-sm text-gray-600">Due: {formatDate(invoiceData.dueDate)}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <h2 className="text-sm font-semibold text-gray-900 mb-2">Bill From</h2>
            <div className="text-sm text-gray-700">
              <p className="font-medium">{invoiceData.billFrom.name}</p>
              <p>{invoiceData.billFrom.address}</p>
              {invoiceData.billFrom.phone && <p>Phone: {invoiceData.billFrom.phone}</p>}
              {invoiceData.billFrom.email && <p>Email: {invoiceData.billFrom.email}</p>}
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-gray-900 mb-2">Bill To</h2>
            <div className="text-sm text-gray-700">
              <p className="font-medium">{invoiceData.billTo.name}</p>
              <p>{invoiceData.billTo.address}</p>
              {invoiceData.billTo.phone && <p>Phone: {invoiceData.billTo.phone}</p>}
              {invoiceData.billTo.email && <p>Email: {invoiceData.billTo.email}</p>}
            </div>
          </div>
        </div>

        <table className="w-full mb-8">
          <thead>
            <tr className="border-b-2 border-gray-300">
              <th className="text-left py-3 text-sm font-semibold text-gray-900">Description</th>
              {invoiceData.lineItems.some(item => item.quantity) && (
                <th className="text-right py-3 text-sm font-semibold text-gray-900">Qty</th>
              )}
              {invoiceData.lineItems.some(item => item.unitPrice) && (
                <th className="text-right py-3 text-sm font-semibold text-gray-900">Unit Price</th>
              )}
              <th className="text-right py-3 text-sm font-semibold text-gray-900">Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoiceData.lineItems.map((item, index) => (
              <tr key={index} className="border-b border-gray-200">
                <td className="py-3 text-sm text-gray-700">{item.description}</td>
                {invoiceData.lineItems.some(i => i.quantity) && (
                  <td className="text-right py-3 text-sm text-gray-700">
                    {item.quantity || '-'}
                  </td>
                )}
                {invoiceData.lineItems.some(i => i.unitPrice) && (
                  <td className="text-right py-3 text-sm text-gray-700">
                    {item.unitPrice ? formatCurrency(item.unitPrice) : '-'}
                  </td>
                )}
                <td className="text-right py-3 text-sm text-gray-700">
                  {formatCurrency(item.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-end mb-8">
          <div className="w-64">
            <div className="flex justify-between py-2 text-sm">
              <span className="text-gray-600">Subtotal:</span>
              <span className="font-medium text-gray-900">{formatCurrency(invoiceData.subtotal)}</span>
            </div>
            {invoiceData.tax !== undefined && invoiceData.tax > 0 && (
              <div className="flex justify-between py-2 text-sm">
                <span className="text-gray-600">
                  Tax {invoiceData.taxRate ? `(${invoiceData.taxRate}%)` : ''}:
                </span>
                <span className="font-medium text-gray-900">{formatCurrency(invoiceData.tax)}</span>
              </div>
            )}
            <div className="flex justify-between py-3 text-lg font-bold border-t-2 border-gray-300">
              <span className="text-gray-900">Total:</span>
              <span className="text-gray-900">{formatCurrency(invoiceData.total)}</span>
            </div>
          </div>
        </div>

        {invoiceData.paymentInfo && (
          <div className="mb-8 p-4 bg-green-50 border border-green-200 rounded-lg">
            <h3 className="text-sm font-semibold text-green-900 mb-2">Payment Received</h3>
            <div className="text-sm text-green-700">
              {invoiceData.paymentInfo.method && (
                <p>Method: {invoiceData.paymentInfo.method}</p>
              )}
              {invoiceData.paymentInfo.checkNumber && (
                <p>Check #: {invoiceData.paymentInfo.checkNumber}</p>
              )}
              {invoiceData.paymentInfo.paidDate && (
                <p>Date: {formatDate(invoiceData.paymentInfo.paidDate)}</p>
              )}
            </div>
          </div>
        )}

        {invoiceData.notes && (
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Notes</h3>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{invoiceData.notes}</p>
          </div>
        )}

        {invoiceData.terms && (
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Terms & Conditions</h3>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{invoiceData.terms}</p>
          </div>
        )}
      </div>
    </div>
  );
}

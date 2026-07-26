import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { Order } from '../types';

/**
 * Downloads a high-resolution PDF for the given order invoice element.
 * Target element should have ID `invoice-document-${orderId}` or be passed directly.
 */
export async function downloadInvoicePDF(order: Order, elementId?: string): Promise<boolean> {
  try {
    const targetId = elementId || `invoice-document-${order.id}`;
    const element = document.getElementById(targetId);

    if (!element) {
      console.error(`Invoice element with ID ${targetId} not found.`);
      return false;
    }

    // Capture element with high quality scale
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
      windowWidth: 800
    });

    const imgData = canvas.toDataURL('image/png');
    
    // Create A4 PDF
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const imgWidth = 190; // mm (A4 width is 210mm, with 10mm margins)
    const pageHeight = 297; // mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 10; // Top margin

    pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    pdf.save(`Invoice-${order.id}.pdf`);
    return true;
  } catch (error) {
    console.error('Error generating PDF:', error);
    return false;
  }
}

/**
 * Triggers native browser print dialog for the invoice element.
 */
export function printInvoice(order: Order, elementId?: string) {
  const targetId = elementId || `invoice-document-${order.id}`;
  const element = document.getElementById(targetId);

  if (!element) {
    window.print();
    return;
  }

  // Create temporary printable iframe window or trigger clean window print
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    window.print();
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Invoice #${order.id} - Korean Skin Food BD</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          @media print {
            body { margin: 0; padding: 0; background: white; }
            @page { margin: 10mm; size: auto; }
          }
        </style>
      </head>
      <body class="bg-white p-4">
        ${element.outerHTML}
        <script>
          setTimeout(() => {
            window.print();
            window.close();
          }, 400);
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}

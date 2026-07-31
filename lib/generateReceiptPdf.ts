import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export type ReceiptData = {
  receiptNo: string;
  tenantName: string;
  propertyName: string;
  unit: string;
  paymentDate: string;
  paymentTime: string;
  method: string;
  amount: number;
  monthlyTotal: number;
  balance: number;
};

export async function generateReceiptPdf(data: ReceiptData): Promise<Uint8Array> {
  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.text("RentFile Payment Receipt", 14, 18);
  doc.setFontSize(11);
  doc.text(`Receipt #: ${data.receiptNo}`,14,28);
  doc.text(`Tenant: ${data.tenantName}`,14,35);
  doc.text(`Property: ${data.propertyName}`,14,42);
  doc.text(`Unit: ${data.unit}`,14,49);

  autoTable(doc,{
    startY:60,
    head:[["Date","Time","Method","Amount"]],
    body:[[data.paymentDate,data.paymentTime,data.method,`KES ${data.amount.toLocaleString()}`]],
    foot:[
      ["","","Monthly Total",`KES ${data.monthlyTotal.toLocaleString()}`],
      ["","","Balance",`KES ${data.balance.toLocaleString()}`]
    ]
  });

  return new Uint8Array(doc.output("arraybuffer"));
}

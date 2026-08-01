import * as React from "react";

export type PaymentReceiptProps = {
  tenantName: string;
  propertyName: string;
  unit: string;
  receiptNo: string;
  paymentDate: string;
  paymentTime: string;
  method: string;
  amount: number;
  monthlyTotal: number;
  balance: number;
};

export default function PaymentReceipt(props: PaymentReceiptProps) {
  const money = (n:number)=>`KES ${n.toLocaleString()}`;

  return (
    <html>
      <body style={{fontFamily:"Arial,sans-serif",background:"#f6f7f9",padding:24}}>
        <table width="600" cellPadding={0} cellSpacing={0} style={{margin:"0 auto",background:"#fff",borderRadius:8,padding:24}}>
          <tr>
            <td>
              <h2 style={{margin:0,color:"#C08A2E"}}>RentFile Payment Receipt</h2>
              <p>Receipt #: {props.receiptNo}</p>
              <hr/>
              <p><b>Tenant:</b> {props.tenantName}</p>
              <p><b>Property:</b> {props.propertyName}</p>
              <p><b>Unit:</b> {props.unit}</p>
              <p><b>Date:</b> {props.paymentDate}</p>
              <p><b>Time:</b> {props.paymentTime}</p>
              <p><b>Method:</b> {props.method}</p>
              <p><b>Amount Paid:</b> {money(props.amount)}</p>
              <p><b>Total Paid This Month:</b> {money(props.monthlyTotal)}</p>
              <p><b>Outstanding Balance:!</b> {money(props.balance)}</p>
              <hr/>
              <p>Thank you for your payment.</p>
              <p>Please find your official PDF receipt attached.</p>
              <p style={{fontSize:12,color:"#666"}}>
                Sent automatically by RentFile.
              </p>
            </td>
          </tr>
        </table>
      </body>
    </html>
  );
}

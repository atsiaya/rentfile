import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export type PaymentSummary = {
  monthlyTotal: number;
  paymentCount: number;
  balance: number;
};

export async function getPaymentSummary(
  tenantId: string,
  monthKey: string,
  monthlyRent: number
): Promise<PaymentSummary> {
  const q = query(
    collection(db, "payments"),
    where("tenantId", "==", tenantId),
    where("monthKey", "==", monthKey)
  );

  const snapshot = await getDocs(q);

  let monthlyTotal = 0;

  snapshot.forEach((doc) => {
    const data = doc.data();
    monthlyTotal += Number(data.amount || 0);
  });

  return {
    monthlyTotal,
    paymentCount: snapshot.size,
    balance: Math.max(monthlyRent - monthlyTotal, 0),
  };
}

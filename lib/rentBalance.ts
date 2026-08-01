/**
 * Calculates rent due from the tenant's move-in month through the current
 * month. Payments are applied to the oldest debt first, so an earlier missed
 * month remains outstanding until the total balance is cleared.
 */
export function outstandingRentBalance(
  monthlyRent: number,
  tenancyStartedAtMillis: number | null | undefined,
  lifetimePayments: number,
  now = new Date()
) {
  const rent = Math.max(Number(monthlyRent) || 0, 0);
  const paid = Math.max(Number(lifetimePayments) || 0, 0);
  const start = tenancyStartedAtMillis ? new Date(tenancyStartedAtMillis) : now;
  const monthsDue = Math.max(
    (now.getFullYear() - start.getFullYear()) * 12 + now.getMonth() - start.getMonth() + 1,
    1
  );
  const totalDue = rent * monthsDue;

  return {
    monthsDue,
    totalDue,
    outstanding: Math.max(totalDue - paid, 0),
  };
}

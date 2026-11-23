// Loan / EMI maths (reducing balance method, the one banks use)
const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
const iso = (d) => d.toISOString().slice(0, 10);
const daysInMonth = (y, m) => new Date(Date.UTC(y, m + 1, 0)).getUTCDate();

// EMI = P * r * (1+r)^n / ((1+r)^n - 1), r = annual rate / 12 / 100
function computeEmi(principal, annualRate, months) {
  const r = annualRate / 12 / 100;
  if (r === 0) return round2(principal / months);
  const f = Math.pow(1 + r, months);
  return round2((principal * r * f) / (f - 1));
}

// same day-of-month every month, clamped for short months (31st -> 30th/28th)
function dateOf(first, k) {
  const y = first.getUTCFullYear(), m = first.getUTCMonth() + k;
  const ny = new Date(Date.UTC(y, m, 1)).getUTCFullYear(), nm = ((m % 12) + 12) % 12;
  return new Date(Date.UTC(ny, nm, Math.min(first.getUTCDate(), daysInMonth(ny, nm))));
}

function buildSchedule({ principal, annualRate, tenureMonths, firstEmiDate }) {
  const r = annualRate / 12 / 100;
  const emi = computeEmi(principal, annualRate, tenureMonths);
  const first = new Date(firstEmiDate);
  let balance = principal;
  const rows = [];
  for (let i = 1; i <= tenureMonths; i++) {
    const interest = round2(balance * r);
    let principalPart = round2(emi - interest);
    if (i === tenureMonths || principalPart > balance) principalPart = round2(balance); // last EMI clears the rounding difference
    balance = round2(balance - principalPart);
    rows.push({ installment: i, date: dateOf(first, i - 1), emi: round2(principalPart + interest), interest, principal: principalPart, balance });
  }
  return { emi, rows };
}

const toDay = (d) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));

function summarize(loan, now = new Date()) {
  const { emi, rows } = buildSchedule(loan);
  const paidMap = new Map((loan.paid || []).map((p) => [p.installment, p.paidOn]));
  const today = toDay(now);
  const schedule = rows.map((r) => ({ ...r, paid: paidMap.has(r.installment), paidOn: paidMap.get(r.installment) || null }));
  const paidRows = schedule.filter((r) => r.paid);
  const unpaid = schedule.filter((r) => !r.paid);
  const repaidPrincipal = paidRows.reduce((a, r) => a + r.principal, 0);
  const outstanding = round2(loan.principal - repaidPrincipal);
  const next = unpaid[0] || null;
  const overdueRows = unpaid.filter((r) => r.date < today);
  return {
    emi,
    totalInterest: round2(rows.reduce((a, r) => a + r.interest, 0)),
    totalPayable: round2(rows.reduce((a, r) => a + r.emi, 0)),
    paidCount: paidRows.length,
    outstanding,
    repaidPercent: Math.round((repaidPrincipal / loan.principal) * 100),
    closed: unpaid.length === 0,
    payoffDate: rows[rows.length - 1].date,
    overdueCount: overdueRows.length,
    nextEmi: next && { installment: next.installment, date: next.date, amount: next.emi, daysToDue: Math.round((toDay(next.date) - today) / 86400000), overdue: next.date < today },
    schedule,
  };
}

// unpaid EMIs falling inside [start, end) - used by the calendar and upcoming payments
function emisInRange(loan, start, end) {
  const { rows } = buildSchedule(loan);
  const paid = new Set((loan.paid || []).map((p) => p.installment));
  return rows.filter((r) => !paid.has(r.installment) && r.date >= start && r.date < end);
}

module.exports = { computeEmi, buildSchedule, summarize, emisInRange, round2, iso };

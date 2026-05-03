export function buildUPILink({ upiId, payeeName, amount, note }) {
  const p = new URLSearchParams({ pa: upiId, pn: payeeName, am: amount.toFixed(2), cu: 'INR', tn: note })
  return `upi://pay?${p.toString()}`
}

export const buildBookingPaymentLink = (booking, owner) =>
  buildUPILink({ upiId: owner.upiId, payeeName: owner.name, amount: booking.securityAmount, note: `Rentizo Security BK-${booking.id.slice(0,8).toUpperCase()}` })

export const buildRentalPaymentLink = (booking, owner) =>
  buildUPILink({ upiId: owner.upiId, payeeName: owner.name, amount: booking.totalAmount, note: `Rentizo Rental BK-${booking.id.slice(0,8).toUpperCase()}` })

export function generateBookingId() {
  return `${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2,6).toUpperCase()}`
}

export function calculateBookingAmounts(items, startDate, endDate) {
  const days = Math.max(1, Math.round((new Date(endDate) - new Date(startDate)) / 86400000))
  const totalAmount    = items.reduce((s, i) => s + i.pricePerDay * days * i.quantity, 0)
  const securityAmount = items.reduce((s, i) => s + i.securityAmount * i.quantity, 0)
  return { durationDays: days, totalAmount, securityAmount, grandTotal: totalAmount + securityAmount }
}

export const formatINR = n => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)

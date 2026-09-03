#!/bin/bash
sed -i -e '/amount: number;/i \  previousDue?: number;\n  remainingDue?: number;' src/types.ts

sed -i -e '/createdAt: nowIso/i \        previousDue: currentDue,\n        remainingDue: newDue,' server.ts

sed -i -e '/<th className="p-4 font-bold">Amount<\/th>/a \                          <th className="p-4 font-bold">Remaining Due<\/th>' src/components/WholesaleLedgerModal.tsx
sed -i -e '/<td className="p-4 whitespace-nowrap text-sm font-black text-emerald-600">/a \                            <\/td>\n                            <td className="p-4 whitespace-nowrap text-sm font-bold text-rose-600">\n                              ৳{(payment.remainingDue ?? 0).toLocaleString()}' src/components/WholesaleLedgerModal.tsx

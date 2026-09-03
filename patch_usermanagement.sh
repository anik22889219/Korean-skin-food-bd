#!/bin/bash
sed -i -e "1s/^/import { WholesaleLedgerModal } from '.\/WholesaleLedgerModal';\n/" src/components/UserManagement.tsx

sed -i -e '/const \[editingUser, setEditingUser\] = useState<User | null>(null);/a \
  const [ledgerCustomerId, setLedgerCustomerId] = useState<string | null>(null);' src/components/UserManagement.tsx

sed -i -e '/<span className={`text-\[10px\] font-bold ${u.wholesaleAccess ? .text-amber-700. : .text-slate-400.}`}/i \
                        {u.wholesaleAccess && (\n                          <button \n                            onClick={() => setLedgerCustomerId(u.uid)}\n                            className="ml-2 px-2 py-0.5 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 text-[10px] rounded-md font-bold cursor-pointer transition"\n                          >\n                            Ledger\n                          </button>\n                        )}\n' src/components/UserManagement.tsx

sed -i -e '/{editingUser && (/i \
      {ledgerCustomerId && (\n        <WholesaleLedgerModal \n          wholesaleCustomerId={ledgerCustomerId}\n          onClose={() => setLedgerCustomerId(null)}\n        />\n      )}\n' src/components/UserManagement.tsx

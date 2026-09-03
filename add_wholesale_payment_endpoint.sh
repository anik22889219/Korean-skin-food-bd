#!/bin/bash
# We will insert it just before `// ====== WHOLESALE API (Step 6) ======` ... actually just after it, or before `app.get("/api/wholesale/orders"`

sed -i -e '/app.post("\/api\/wholesale\/orders\/create", async (req, res) => {/i \
\
// ====== WHOLESALE PAYMENTS API (Step 7) ======\n\
app.post("/api/wholesale/payments", async (req, res) => {\n\
  if (!db) return res.status(500).json({ success: false, error: "Database not initialized" });\n\
  const { wholesaleCustomerId, amount, paymentMethod, reference, note, createdBy, orderId } = req.body;\n\
  if (!wholesaleCustomerId || typeof amount !== "number" || amount <= 0 || !paymentMethod || !createdBy) {\n\
    return res.status(400).json({ success: false, error: "Missing required fields" });\n\
  }\n\
  try {\n\
    const customerRef = doc(db, "wholesale_customers", wholesaleCustomerId);\n\
    const nowIso = new Date().toISOString();\n\
    const paymentId = `wp-${Date.now()}-${Math.floor(100+Math.random()*900)}`;\n\
    const paymentRef = doc(db, "wholesale_payments", paymentId);\n\
\n\
    const newPayment = await runTransaction(db, async (transaction: any) => {\n\
      const custSnap = await transaction.get(customerRef);\n\
      if (!custSnap.exists()) throw new Error("Wholesale customer not found");\n\
\n\
      const custData = custSnap.data();\n\
      const currentPaid = Number(custData.totalPaid || 0);\n\
      const currentDue = Number(custData.totalDue || 0);\n\
      const newPaid = currentPaid + amount;\n\
      const newDue = currentDue - amount;\n\
\n\
      transaction.update(customerRef, {\n\
        totalPaid: newPaid,\n\
        totalDue: newDue\n\
      });\n\
\n\
      const paymentDoc = {\n\
        id: paymentId,\n\
        wholesaleCustomerId,\n\
        amount,\n\
        paymentMethod,\n\
        reference: reference || "",\n\
        note: note || "",\n\
        createdBy,\n\
        createdAt: nowIso\n\
      };\n\
      if (orderId) (paymentDoc as any).orderId = orderId;\n\
\n\
      transaction.set(paymentRef, paymentDoc);\n\
      return paymentDoc;\n\
    });\n\
\n\
    return res.json({ success: true, payment: newPayment });\n\
  } catch (err: any) {\n\
    console.error("[Wholesale Payment Engine] Error adding payment:", err);\n\
    return res.status(500).json({ success: false, error: err.message || "Failed to process payment" });\n\
  }\n\
});\n\
' server.ts
sed -i -e '/app.post("\/api\/wholesale\/payments", async (req, res) => {/i \
app.get("/api/wholesale/payments/:wholesaleCustomerId", async (req, res) => {\n\
  if (!db) return res.status(500).json({ success: false, error: "Database not initialized" });\n\
  const { wholesaleCustomerId } = req.params;\n\
  try {\n\
    const q = query(collection(db, "wholesale_payments"), where("wholesaleCustomerId", "==", wholesaleCustomerId), orderBy("createdAt", "desc"));\n\
    const snap = await getDocs(q);\n\
    const payments = snap.docs.map(d => d.data());\n\
    return res.json({ success: true, payments });\n\
  } catch (err: any) {\n\
    console.error("[Wholesale Payment Engine] Error fetching payments:", err);\n\
    return res.status(500).json({ success: false, error: err.message || "Failed to fetch payments" });\n\
  }\n\
});\n\
' server.ts

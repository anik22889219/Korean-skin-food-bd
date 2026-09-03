#!/bin/bash
sed -i -e '/match \/wholesale_orders\/{orderId} {/i \
    match /wholesale_payments/{paymentId} {\n      allow read: if isAdmin() || isSuperAdmin() || resource.data.wholesaleCustomerId == request.auth.uid;\n      allow create: if isAdmin() || isSuperAdmin();\n      allow update, delete: if false;\n    }\n' firestore.rules

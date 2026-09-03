#!/bin/bash
sed -i -e '/const \[editingUser, setEditingUser\] = useState<UserProfile | null>(null);/a \
  const [ledgerCustomerId, setLedgerCustomerId] = useState<string | null>(null);' src/components/UserManagement.tsx

sed -i -e 's/import { getFirestore, collection, doc, getDoc, setDoc, getDocs, runTransaction, query, where, deleteDoc } from "firebase\/firestore";/import { getFirestore, collection, doc, getDoc, setDoc, getDocs, runTransaction, query, where, deleteDoc, orderBy } from "firebase\/firestore";/g' server.ts

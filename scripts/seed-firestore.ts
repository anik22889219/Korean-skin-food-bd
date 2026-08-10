import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator, collection, doc, setDoc } from 'firebase/firestore';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || "dummy-api-key",
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || "dummy-auth-domain",
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || "gen-lang-client-0633897500",
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || "dummy-storage-bucket",
  messagingSenderId: process.env.VITE_FIREBASE_SENDER_ID || "dummy-sender-id",
  appId: process.env.VITE_FIREBASE_APP_ID || "dummy-app-id"
};

const app = initializeApp(firebaseConfig);
const databaseId = process.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || "ai-studio-koreanskinfoodbd-59297321-4843-435b-aad0-f55eda410cd4";
const db = getFirestore(app, databaseId);

// Connect to the local emulator
try {
  connectFirestoreEmulator(db, 'localhost', 8080);
  console.log('Connected to local Firestore emulator on port 8080');
} catch (error) {
  console.warn('Could not connect to Firestore emulator, writing directly to Firestore:', error);
}

// 1. Products (Demo products removed)
const products: any[] = [];


// 2. 8 Sample Orders with diverse statuses and Bangladeshi details
const orders = [
  {
    id: 'ORD-582910',
    customerName: 'Ayesha Rahman',
    customerPhone: '01712345678',
    address: 'House 42, Road 11, Banani, Dhaka (Dhaka)',
    items: [
      { productId: 'cosrx-snail-96', name: 'COSRX Advanced Snail 96 Mucin Power Essence', price: 1850, quantity: 1 },
      { productId: 'boj-sunscreen-rice', name: 'Beauty of Joseon Relief Sun : Rice + Probiotics SPF50+', price: 1650, quantity: 1 }
    ],
    totalAmount: 3580, // includes 80 Tk shipping inside Dhaka
    status: 'pending',
    createdAt: new Date(Date.now() - 4 * 3600000).toISOString(), // 4 hours ago
    paymentMethod: 'COD',
    sessionType: 'Online',
    isPaid: false
  },
  {
    id: 'ORD-912832',
    customerName: 'Sajid Islam',
    customerPhone: '01987654321',
    address: 'Sector 4, Uttara, Dhaka (Dhaka)',
    items: [
      { productId: 'cosrx-cleanser-goodmorning', name: 'COSRX Low pH Good Morning Gel Cleanser', price: 1050, quantity: 2 }
    ],
    totalAmount: 2180, // includes 80 Tk shipping
    status: 'delivered',
    createdAt: new Date(Date.now() - 24 * 3600000).toISOString(), // 1 day ago
    paymentMethod: 'COD',
    sessionType: 'Online',
    isPaid: true
  },
  {
    id: 'ORD-204592',
    customerName: 'Fariha Chowdhury',
    customerPhone: '01823456789',
    address: 'Flat 3B, House 15, Nasirabad, Chittagong (Outside Dhaka)',
    items: [
      { productId: 'anua-toner-77', name: 'Anua Heartleaf 77% Soothing Toner', price: 2100, quantity: 1 },
      { productId: 'laneige-lip-mask', name: 'Laneige Lip Sleeping Mask Berry', price: 1400, quantity: 1 }
    ],
    totalAmount: 3650, // includes 150 Tk shipping outside Dhaka
    status: 'processing',
    createdAt: new Date(Date.now() - 36 * 3600000).toISOString(), // 1.5 days ago
    paymentMethod: 'COD',
    sessionType: 'Online',
    isPaid: false
  },
  {
    id: 'ORD-759281',
    customerName: 'Tanvir Ahmed',
    customerPhone: '01512345678',
    address: 'Bari 82, Sheikh Mujib Road, Sylhet (Outside Dhaka)',
    items: [
      { productId: 'skin1004-centella-ampoule', name: 'Skin1004 Madagascar Centella Ampoule', price: 1950, quantity: 1 }
    ],
    totalAmount: 2100, // includes 150 Tk shipping
    status: 'shipped',
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(), // 2 days ago
    paymentMethod: 'COD',
    sessionType: 'Online',
    isPaid: false
  },
  {
    id: 'ORD-109384',
    customerName: 'Nusrat Jahan',
    customerPhone: '01687654321',
    address: 'Block C, Lalmatia, Dhaka (Dhaka)',
    items: [
      { productId: 'mediheal-tea-tree-mask', name: 'Mediheal Tea Tree Essential Mask', price: 200, quantity: 5 },
      { productId: 'iunik-centella-gel-cream', name: 'iUNIK Centella Calming Gel Cream', price: 1550, quantity: 1 }
    ],
    totalAmount: 2630, // includes 80 Tk shipping
    status: 'cancelled',
    createdAt: new Date(Date.now() - 3 * 86400000).toISOString(), // 3 days ago
    paymentMethod: 'COD',
    sessionType: 'Online',
    isPaid: false
  },
  {
    id: 'ORD-403928',
    customerName: 'Imran Khan',
    customerPhone: '01312345678',
    address: 'In-Store Walk-In, Dhaka POS',
    items: [
      { productId: 'beauty-of-joseon-ginseng-water', name: 'Beauty of Joseon Ginseng Essence Water', price: 1850, quantity: 2 },
      { productId: 'cosrx-aloe-sunscreen', name: 'COSRX Aloe Soothing Sun Cream SPF50+ PA+++', price: 1550, quantity: 1 }
    ],
    totalAmount: 5250, // no shipping charge for in-person POS checkout
    status: 'delivered',
    createdAt: new Date(Date.now() - 4 * 86400000).toISOString(), // 4 days ago
    paymentMethod: 'POS_In_Person',
    sessionType: 'POS',
    isPaid: true
  },
  {
    id: 'ORD-882310',
    customerName: 'Samia Karim',
    customerPhone: '01799887766',
    address: 'House 112, Sector 11, Uttara, Dhaka (Dhaka)',
    items: [
      { productId: 'cosrx-snail-96', name: 'COSRX Advanced Snail 96 Mucin Power Essence', price: 1850, quantity: 1 }
    ],
    totalAmount: 1930, // includes 80 Tk shipping
    status: 'delivered',
    createdAt: new Date(Date.now() - 5 * 86400000).toISOString(), // 5 days ago
    paymentMethod: 'COD',
    sessionType: 'Online',
    isPaid: true
  },
  {
    id: 'ORD-302918',
    customerName: 'Rahat Hassan',
    customerPhone: '01911223344',
    address: 'Holding 42, Ward 5, Rajshahi (Outside Dhaka)',
    items: [
      { productId: 'somebymi-aha-bha-toner', name: 'Some By Mi AHA BHA PHA 30Days Miracle Toner', price: 1650, quantity: 1 },
      { productId: 'cosrx-pimple-patch', name: 'COSRX Acne Pimple Master Patch (24 patches)', price: 350, quantity: 2 }
    ],
    totalAmount: 2500, // includes 150 Tk shipping
    status: 'pending',
    createdAt: new Date(Date.now() - 6 * 86400000).toISOString(), // 6 days ago
    paymentMethod: 'COD',
    sessionType: 'Online',
    isPaid: false
  }
];

// 3. 3 Sample Users with different roles
const users = [
  {
    uid: 'staff-admin-super',
    email: 'admin@koreanskinfoodbd.com',
    name: 'Korean Skin Food Super Admin',
    role: 'admin'
  },
  {
    uid: 'staff-inventory-manager',
    email: 'manager@koreanskinfoodbd.com',
    name: 'Korean Skin Food Inventory Lead',
    role: 'inventory_manager'
  },
  {
    uid: 'cust-regular-lover',
    phone: '01712345678',
    name: 'Ayesha Rahman',
    role: 'customer'
  }
];

// 4. Site Settings Document
const siteSettings = {
  deliveryChargeInsideDhaka: 80,
  deliveryChargeOutsideDhaka: 150,
  whatsappNumber: '+8801712345678',
  popupTextEn: '🔥 Eid Shopping Extravaganza! Use promo code EIDGLOW to get an extra 5% off! Free beauty consultations via WhatsApp! 🌸',
  popupTextBn: '🔥 ঈদ শপিং ধামাকা! অতিরিক্ত ৫% ডিসকাউন্ট পেতে EIDGLOW প্রোমো কোড ব্যবহার করুন! হোয়াটসঅ্যাপে ফ্রি বিউটি কনসালটেশন নিন! 🌸',
  announcementEn: '✨ 100% Authentic Korean Cosmetics Direct from Seoul. Cash on Delivery across Bangladesh. 🇧🇩',
  announcementBn: '✨ ১০০% অথেন্টিক কোরিয়ান প্রসাধনী সরাসরি সিউল থেকে আমদানিকৃত। সারা বাংলাদেশে ক্যাশ অন ডেলিভারি। 🇧🇩'
};

async function seed() {
  console.log('--- FIRESTORE SEEDING STARTED ---');

  // Seed Products
  console.log('Seeding products...');
  for (const product of products) {
    const productRef = doc(db, 'products', product.id);
    await setDoc(productRef, product);
    console.log(`- Seeded product: ${product.name}`);
  }

  // Seed Orders
  console.log('Seeding orders...');
  for (const order of orders) {
    const orderRef = doc(db, 'orders', order.id);
    await setDoc(orderRef, order);
    console.log(`- Seeded order: ${order.id}`);
  }

  // Seed Users
  console.log('Seeding users...');
  for (const user of users) {
    const userRef = doc(db, 'users', user.uid);
    await setDoc(userRef, user);
    console.log(`- Seeded user: ${user.name} (${user.role})`);
  }

  // Seed Site Settings
  console.log('Seeding site settings...');
  const settingsRef = doc(db, 'site_settings', 'main_config');
  await setDoc(settingsRef, siteSettings);
  console.log('- Seeded site_settings doc: main_config');

  console.log('--- FIRESTORE SEEDING COMPLETED SUCCESSFULLY ---');
}

seed().catch(error => {
  console.error('Seeding failed with error:', error);
});

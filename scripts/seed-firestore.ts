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

// 1. 20 Realistic K-Beauty Products
const products = [
  {
    id: 'cosrx-snail-96',
    name: 'COSRX Advanced Snail 96 Mucin Power Essence',
    nameBN: 'কসআরএক্স এডভান্সড স্নেইল ৯৬ মিউসিন পাওয়ার এসেন্স',
    brand: 'COSRX',
    category: 'Serum & Essence',
    skinTypes: ['Dry', 'Sensitive', 'Acne-Prone', 'Combination'],
    price: 1850,
    image: 'https://images.unsplash.com/photo-1608248597481-496100c8c836?w=600&auto=format&fit=crop&q=60',
    stock: 24,
    description: 'Lightweight essence which absorbs into skin fast to give skin a natural glow from inside. Formulated with 96.3% Snail Secretion Filtrate.',
    descriptionBN: 'হালকা এসেন্স যা ত্বকে দ্রুত শোষিত হয়ে ভেতর থেকে প্রাকৃতিক উজ্জ্বলতা দেয়। ৯৬.৩% স্নেইল সিক্রেশন ফিল্ট্রেট দিয়ে তৈরি।',
    rating: 4.8,
    reviewsCount: 124,
    barcode: '8809598450123',
    qrCodeUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=cosrx-snail-96',
    is_featured: true,
    ingredients: 'Snail Secretion Filtrate, Betaine, Butylene Glycol, 1,2-Hexanediol, Sodium Polyacrylate, Phenoxyethanol, Sodium Hyaluronate, Allantoin, Ethyl Hexanediol, Carbomer, Panthenol, Arginine'
  },
  {
    id: 'boj-sunscreen-rice',
    name: 'Beauty of Joseon Relief Sun : Rice + Probiotics SPF50+',
    nameBN: 'বিউটি অব জোসিয়ন রিলিফ সান : রাইস + প্রোবায়োটিকস SPF50+',
    brand: 'Beauty of Joseon',
    category: 'Sunscreen',
    skinTypes: ['Sensitive', 'Dry', 'Combination'],
    price: 1650,
    image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600&auto=format&fit=crop&q=60',
    stock: 5, // low stock!
    description: 'Relief Sun is a lightweight and creamy organic sunscreen that’s comfortable on skin. Containing 30% rice extract and grain fermented extracts.',
    descriptionBN: 'রিলিফ সান একটি হালকা এবং ক্রিমি জৈব সানস্ক্রিন যা ত্বকে অত্যন্ত আরামদায়ক। এতে রয়েছে ৩০% চালের নির্যাস এবং শস্য ফার্মেন্টেড নির্যাস।',
    rating: 4.9,
    reviewsCount: 342,
    barcode: '8809653240222',
    qrCodeUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=boj-sunscreen-rice',
    is_featured: true,
    ingredients: 'Water, Oryza Sativa (Rice) Extract (30%), Dibutyl Adipate, Propanediol, Diethylamino Hydroxybenzoyl Hexyl Benzoate, Polymethylsilsesquioxane, Ethylhexyl Triazone, Niacinamide'
  },
  {
    id: 'cosrx-cleanser-goodmorning',
    name: 'COSRX Low pH Good Morning Gel Cleanser',
    nameBN: 'কসআরএক্স লো পিএইচ গুড মর্নিং জেল ক্লিনজার',
    brand: 'COSRX',
    category: 'Cleanser',
    skinTypes: ['Oily', 'Sensitive', 'Acne-Prone', 'Combination'],
    price: 1150,
    discountPrice: 1050, // Discounted
    autoDiscountReason: 'AI recommended 8.7% discount due to high stock volume (over 40 units)',
    image: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=600&auto=format&fit=crop&q=60',
    stock: 42,
    description: 'A gentle gel cleanser formulated with a mildly acidic pH of 5.30-6.30, tea tree oil, and BHA to soothe, exfoliate, and hydrate.',
    descriptionBN: 'একটি মৃদু জেল ক্লিনজার যা ৫.৩০-৬.৩০ পিএইচ মাত্রা, টি ট্রি অয়েল এবং বিএইচএ সমৃদ্ধ, যা ত্বক শান্ত, এক্সফোলিয়েট এবং হাইড্রেট করে।',
    rating: 4.7,
    reviewsCount: 210,
    barcode: '8809598450017',
    qrCodeUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=cosrx-cleanser-goodmorning',
    isSlowMoving: true,
    ingredients: 'Water, Cocamidopropyl Betaine, Sodium Lauroyl Methyl Isethionate, Polysorbate 20, Styrax Japonicus Branch/Fruit/Leaf Extract, Butylene Glycol, Saccharomyces Ferment, Cryptomeria Japonica Leaf Extract'
  },
  {
    id: 'anua-toner-77',
    name: 'Anua Heartleaf 77% Soothing Toner',
    nameBN: 'আনুয়া হার্টলিফ ৭৭% সুথিং টোনার',
    brand: 'Anua',
    category: 'Toner',
    skinTypes: ['Sensitive', 'Acne-Prone', 'Oily', 'Combination'],
    price: 2100,
    image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600&auto=format&fit=crop&q=60',
    stock: 12,
    description: 'Perfectly formulated to soothe, hydrate, and calm redness on skin. Contains 77% Heartleaf Extract which is well known for anti-inflammatory properties.',
    descriptionBN: 'ত্বককে প্রশমিত, হাইড্রেট এবং লালচে ভাব দূর করতে নিখুঁতভাবে তৈরি। এতে রয়েছে ৭৭% হার্টলিফ নির্যাস যা প্রদাহ-বিরোধী গুণের জন্য পরিচিত।',
    rating: 4.8,
    reviewsCount: 180,
    barcode: '8809756120456',
    qrCodeUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=anua-toner-77',
    is_featured: true,
    ingredients: 'Houttuynia Cordata Extract (77%), Water, 1,2-Hexanediol, Glycerin, Betaine, Centella Asiatica Extract, Isopentyldiol, Methylpropanediol, Portulaca Oleracea Extract'
  },
  {
    id: 'skin1004-centella-ampoule',
    name: 'Skin1004 Madagascar Centella Ampoule',
    nameBN: 'স্কিন১০০৪ মাদাগাস্কার সেন্টেলা অ্যাম্পুল',
    brand: 'Skin1004',
    category: 'Serum & Essence',
    skinTypes: ['Sensitive', 'Dry', 'Acne-Prone'],
    price: 1950,
    image: 'https://images.unsplash.com/photo-1601049541289-9b1b7bbbfe19?w=600&auto=format&fit=crop&q=60',
    stock: 3, // low stock!
    description: 'Made with 100% Centella Asiatica Extract from Madagascar. It deeply hydrates, balances sebum levels, reduces acne, dry patches, and skin irritation.',
    descriptionBN: 'মাদাগাস্কার থেকে ১০০% সেন্টেলা এশিয়াটিকা নির্যাস দিয়ে তৈরি। এটি ত্বককে গভীরভাবে হাইড্রেট করে, সেবাম নিয়ন্ত্রণ করে এবং ব্রণ ও জ্বালাপোড়া কমায়।',
    rating: 4.9,
    reviewsCount: 95,
    barcode: '8809530040182',
    qrCodeUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=skin1004-centella-ampoule',
    is_featured: true,
    ingredients: '100% Centella Asiatica Extract from Madagascar'
  },
  {
    id: 'laneige-lip-mask',
    name: 'Laneige Lip Sleeping Mask Berry',
    nameBN: 'লেনেইজ লিপ স্লিপিং মাস্ক বেরি',
    brand: 'Laneige',
    category: 'Lip Care',
    skinTypes: ['Dry', 'Sensitive'],
    price: 1400,
    image: 'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=600&auto=format&fit=crop&q=60',
    stock: 28,
    description: 'A leave-on lip mask that delivers intense moisture and antioxidants while you sleep with its Berry Mix Complex.',
    descriptionBN: 'একটি লিভ-অন লিপ মাস্ক যা ঘুমের মাঝে বেরি মিক্স কমপ্লেক্সের মাধ্যমে ঠোঁটে গভীর আর্দ্রতা ও অ্যান্টিঅক্সিডেন্ট পৌঁছে দেয়।',
    rating: 4.6,
    reviewsCount: 156,
    barcode: '8809643120155',
    qrCodeUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=laneige-lip-mask',
    ingredients: 'Diisostearyl Malate, Hydrogenated Polyisobutene, Phytosteryl/Isostearyl/Cetyl/Stearyl/Behenyl Dimer Dilinoleate, Hydrogenated Poly(C6-14 Olefin), Polybutene'
  },
  {
    id: 'round-lab-birch-cream',
    name: 'Round Lab Birch Juice Moisturizing Cream',
    nameBN: 'রাউন্ড ল্যাব বার্চ জুস ময়শ্চারাইজিং ক্রিম',
    brand: 'Round Lab',
    category: 'Moisturizer',
    skinTypes: ['Dry', 'Combination', 'Sensitive'],
    price: 2150,
    discountPrice: 1950, // Discounted
    image: 'https://images.unsplash.com/photo-1601049541289-9b1b7bbbfe19?w=600&auto=format&fit=crop&q=60',
    stock: 14,
    description: 'A moisturizing cream enriched with Inje’s Birch Juice and Vita Hyaluronic Acid to form a water barrier for keeping skin deeply hydrated.',
    descriptionBN: 'ইনজে বার্চ জুস এবং ভিটা হাইলুরোনিক এসিড সমৃদ্ধ যা ত্বককে গভীরভাবে হাইড্রেট রাখতে একটি ওয়াটার ব্যারিয়ার তৈরি করে।',
    rating: 4.8,
    reviewsCount: 112,
    barcode: '8809739010321',
    qrCodeUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=round-lab-birch-cream',
    ingredients: 'Water, Glycerin, Methylpropanediol, Birch Sap (10,000ppm), 1,2-Hexanediol, Cetyl Ethylhexanoate, Sodium Hyaluronate'
  },
  {
    id: 'somebymi-snail-truecica',
    name: 'Some By Mi Snail Truecica Miracle Repair Serum',
    nameBN: 'সাম বাই মি স্নেইল ট্রুসিক্কা মিরাকেল রিপেয়ার সিরাম',
    brand: 'Some By Mi',
    category: 'Serum & Essence',
    skinTypes: ['Acne-Prone', 'Sensitive', 'Oily'],
    price: 1800,
    image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600&auto=format&fit=crop&q=60',
    stock: 2, // low stock!
    description: 'Formulated with Black Snail Extract and Truecica to heal acne scars, regenerate skin barrier and soothe red skin irritation.',
    descriptionBN: 'ব্ল্যাক স্নেইল এক্সট্র্যাক্ট এবং ট্রুসিক্কা দিয়ে সমৃদ্ধ যা ব্রণের দাগ নিরাময় করে, ত্বকের ড্যামেজড ব্যারিয়ার রিপেয়ার করে।',
    rating: 4.7,
    reviewsCount: 88,
    barcode: '8809626320444',
    qrCodeUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=somebymi-snail-truecica',
    ingredients: 'Snail Secretion Filtrate, Butylene Glycol, Water, Niacinamide, 1,2-Hexanediol, Centella Asiatica Extract, Salvia Officinalis (Sage) Leaf Extract'
  },
  {
    id: 'anua-cleansing-oil',
    name: 'Anua Heartleaf Pore Control Cleansing Oil',
    nameBN: 'আনুয়া হার্টলিফ পোর কন্ট্রোল ক্লিনজিং অয়েল',
    brand: 'Anua',
    category: 'Cleanser',
    skinTypes: ['Oily', 'Acne-Prone', 'Combination'],
    price: 1950,
    discountPrice: 1750, // Discounted
    image: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=600&auto=format&fit=crop&q=60',
    stock: 18,
    description: 'An oil cleanser formulated with heartleaf extract to deeply remove makeup, sebum, and blackheads without clogging pores.',
    descriptionBN: 'একটি তেলভিত্তিক ক্লিনজার যা মেকআপ, সেবাম এবং ব্ল্যাকহেড পোরস ক্লগ না করেই গভীর থেকে দূর করে।',
    rating: 4.8,
    reviewsCount: 154,
    barcode: '8809756121125',
    qrCodeUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=anua-cleansing-oil',
    ingredients: 'Ethylhexyl Palmitate, Sorbeth-30 Tetraoleate, Sorbitan Sesquioleate, Houttuynia Cordata Extract, Simmondsia Chinensis (Jojoba) Seed Oil'
  },
  {
    id: 'innisfree-green-tea-serum',
    name: 'Innisfree Green Tea Seed Hyaluronic Serum',
    nameBN: 'ইনিসফ্রি গ্রিন টি সিড হাইলুরোনিক সিরাম',
    brand: 'Innisfree',
    category: 'Serum & Essence',
    skinTypes: ['Dry', 'Combination', 'Oily'],
    price: 2100,
    image: 'https://images.unsplash.com/photo-1608248597481-496100c8c836?w=600&auto=format&fit=crop&q=60',
    stock: 9,
    description: 'A daily moisture-barrier strengthening serum, formulated with Green Tea Tri-biotics and 5 types of hyaluronic acid.',
    descriptionBN: 'গ্রিন টি ট্রাই-বায়োটিকস এবং ৫ ধরণের হাইলুরোনিক এসিড সমৃদ্ধ ময়েশ্চার-ব্যারিয়ার শক্তিশালীকারী একটি সিরাম।',
    rating: 4.6,
    reviewsCount: 76,
    barcode: '8809612840912',
    qrCodeUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=innisfree-green-tea-serum',
    ingredients: 'Water, Propanediol, Glycerin, 1,2-Hexanediol, Niacinamide, Betaine, Camellia Sinensis Seed Oil (2,600ppm), Camellia Sinensis Leaf Extract'
  },
  {
    id: 'skin1004-centella-soothing-cream',
    name: 'Skin1004 Madagascar Centella Soothing Cream',
    nameBN: 'স্কিন১০০৪ মাদাগাস্কার সেন্টেলা সুথিং ক্রিম',
    brand: 'Skin1004',
    category: 'Moisturizer',
    skinTypes: ['Sensitive', 'Oily', 'Combination'],
    price: 1750,
    image: 'https://images.unsplash.com/photo-1601049541289-9b1b7bbbfe19?w=600&auto=format&fit=crop&q=60',
    stock: 4, // low stock!
    description: 'An ultra-soothing gel cream containing Madagascar Centella extracts and 3 organic lipid components to calm damaged skin barrier.',
    descriptionBN: 'মাদাগাস্কার সেন্টেলা নির্যাস এবং ৩টি জৈব লিপিড উপাদান সমৃদ্ধ একটি জেল ক্রিম যা ড্যামেজড স্কিন ব্যারিয়ার শান্ত করে।',
    rating: 4.8,
    reviewsCount: 92,
    barcode: '8809530040526',
    qrCodeUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=skin1004-centella-soothing-cream',
    ingredients: 'Centella Asiatica Extract (72%), Glycerin, Propanediol, Dipropylene Glycol, Cyclomethicone, Water, 1,2-Hexanediol'
  },
  {
    id: 'mediheal-tea-tree-mask',
    name: 'Mediheal Tea Tree Essential Mask',
    nameBN: 'মেডিহিল টি ট্রি এসেনশিয়াল মাস্ক',
    brand: 'Mediheal',
    category: 'Mask',
    skinTypes: ['Acne-Prone', 'Oily', 'Sensitive'],
    price: 250,
    discountPrice: 200, // Discounted
    image: 'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=600&auto=format&fit=crop&q=60',
    stock: 80,
    description: 'A classic soothing sheet mask formulated with tea tree leaf oil and extract to clear blemishes and calm irritated acne outbreaks.',
    descriptionBN: 'টি ট্রি লিফ অয়েল ও নির্যাস সমৃদ্ধ একটি শিট মাস্ক যা ব্রণের লালচে ভাব দূর করে এবং ত্বক শান্ত করে।',
    rating: 4.9,
    reviewsCount: 420,
    barcode: '8809261540321',
    qrCodeUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=mediheal-tea-tree-mask',
    ingredients: 'Water, Glycerin, Propanediol, 1,2-Hexanediol, Salix Alba (Willow) Bark Extract, Centella Asiatica Extract, Melaleuca Alternifolia (Tea Tree) Extract'
  },
  {
    id: 'cosrx-aloe-sunscreen',
    name: 'COSRX Aloe Soothing Sun Cream SPF50+ PA+++',
    nameBN: 'কসআরএক্স অ্যালো সুথিং সান ক্রিম SPF50+ PA+++',
    brand: 'COSRX',
    category: 'Sunscreen',
    skinTypes: ['Dry', 'Sensitive', 'Normal'],
    price: 1550,
    image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600&auto=format&fit=crop&q=60',
    stock: 19,
    description: 'Formulated with 5,500ppm of Aloe Vera Leaf Extract, this daily sun block protects skin against UVA & UVB rays while hydrating.',
    descriptionBN: '৫,৫০০ পিপিএম অ্যালোভেরা পাতার নির্যাস সমৃদ্ধ যা ক্ষতিকর রশ্মি থেকে সুরক্ষার পাশাপাশি ত্বক হাইড্রেট রাখে।',
    rating: 4.7,
    reviewsCount: 205,
    barcode: '8809598450215',
    qrCodeUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=cosrx-aloe-sunscreen',
    ingredients: 'Water, Ethylhexyl Methoxycinnamate, Glycerin, Propylene Glycol, Cyclopentasiloxane, Bis-Ethylhexyloxyphenol Methoxyphenyl Triazine'
  },
  {
    id: 'beauty-of-joseon-ginseng-water',
    name: 'Beauty of Joseon Ginseng Essence Water',
    nameBN: 'বিউটি অব জোসিয়ন জিনসেং এসেন্স ওয়াটার',
    brand: 'Beauty of Joseon',
    category: 'Toner',
    skinTypes: ['Dry', 'Combination', 'Sensitive'],
    price: 1850,
    image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600&auto=format&fit=crop&q=60',
    stock: 15,
    description: 'A refreshing nourishing toner enriched with Hanbang (traditional Korean herbal medicine) ingredients for smooth and revitalized skin.',
    descriptionBN: 'ঐতিহ্যবাহী কোরিয়ান ভেষজ উপাদান সমৃদ্ধ একটি পুষ্টিকর টোনার যা ত্বক মসৃণ ও প্রাণবন্ত করতে সাহায্য করে।',
    rating: 4.8,
    reviewsCount: 162,
    barcode: '8809653241038',
    qrCodeUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=beauty-of-joseon-ginseng-water',
    ingredients: 'Panax Ginseng Root Water, Butylene Glycol, Glycerin, Propanediol, Niacinamide, 1,2-Hexanediol, Water, Hydroxyacetophenone'
  },
  {
    id: 'cosrx-bha-liquid',
    name: 'COSRX BHA Blackhead Power Liquid',
    nameBN: 'কসআরএক্স বিএইচএ ব্ল্যাকহেড পাওয়ার লিকুইড',
    brand: 'COSRX',
    category: 'Serum & Essence',
    skinTypes: ['Oily', 'Acne-Prone', 'Combination'],
    price: 1950,
    discountPrice: 1800, // Discounted
    image: 'https://images.unsplash.com/photo-1608248597481-496100c8c836?w=600&auto=format&fit=crop&q=60',
    stock: 11,
    description: 'An exfoliating liquid to clear pores, prevent blackheads and control excess sebum production with 4% natural BHA.',
    descriptionBN: '৪% প্রাকৃতিক বিএইচএ সমৃদ্ধ এক্সফোলিয়েটিং তরল যা পোর পরিষ্কার করে এবং অতিরিক্ত সেবাম নিয়ন্ত্রণ করে ব্ল্যাকহেড প্রতিরোধ করে।',
    rating: 4.7,
    reviewsCount: 148,
    barcode: '8809598450192',
    qrCodeUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=cosrx-bha-liquid',
    ingredients: 'Salix Alba (Willow) Bark Water, Butylene Glycol, Betaine Salicylate (4%), Niacinamide, 1,2-Hexanediol, Arginine, Panthenol'
  },
  {
    id: 'somebymi-aha-bha-toner',
    name: 'Some By Mi AHA BHA PHA 30Days Miracle Toner',
    nameBN: 'সাম বাই মি এএইচএ বিএইচএ পিএইচএ ৩০ডেইজ মিরাকেল টোনার',
    brand: 'Some By Mi',
    category: 'Toner',
    skinTypes: ['Oily', 'Acne-Prone', 'Sensitive'],
    price: 1650,
    image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600&auto=format&fit=crop&q=60',
    stock: 25,
    description: 'An anti-acne toner that contains AHA, BHA, and PHA to clear dead skin cells and tea tree water to calm outbreaks in 30 days.',
    descriptionBN: 'একটি ব্রণ-বিরোধী টোনার যাতে রয়েছে এএইচএ, বিএইচএ এবং পিএইচএ যা মরা চামড়া পরিষ্কার করে এবং টি ট্রি ওয়াটার ত্বক শান্ত রাখে।',
    rating: 4.6,
    reviewsCount: 198,
    barcode: '8809626320017',
    qrCodeUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=somebymi-aha-bha-toner',
    ingredients: 'Water, Butylene Glycol, Dipropylene Glycol, Glycerin, Niacinamide, Melaleuca Alternifolia (Tea Tree) Leaf Extract, Polyglyceryl-4 Caprate'
  },
  {
    id: 'beauty-of-joseon-dynasty-cream',
    name: 'Beauty of Joseon Dynasty Cream',
    nameBN: 'বিউটি অব জোসিয়ন ডাইনেস্টি ক্রিম',
    brand: 'Beauty of Joseon',
    category: 'Moisturizer',
    skinTypes: ['Dry', 'Combination', 'Sensitive'],
    price: 1950,
    image: 'https://images.unsplash.com/photo-1601049541289-9b1b7bbbfe19?w=600&auto=format&fit=crop&q=60',
    stock: 3, // low stock!
    description: 'This luxurious daily cream provides deep, long-lasting moisture with 29% rice bran water, 5% ginseng root water, and 2% niacinamide.',
    descriptionBN: 'এই বিলাসবহুল দৈনিক ক্রিমটি ২৯% চালের কুঁড়ার পানি ও ৫% জিনসেং রুটের পানির মাধ্যমে ত্বকে দীর্ঘস্থায়ী আর্দ্রতা প্রদান করে।',
    rating: 4.8,
    reviewsCount: 110,
    barcode: '8809653241410',
    qrCodeUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=beauty-of-joseon-dynasty-cream',
    ingredients: 'Water, Oryza Sativa (Rice) Bran Water, Glycerin, Panax Ginseng Root Water, Methylpropanediol, Niacinamide, Safflower Seed Oil'
  },
  {
    id: 'skin1004-centella-sun-serum',
    name: 'Skin1004 Madagascar Centella Hyalu-Cica Water-Fit Sun Serum SPF50+',
    nameBN: 'স্কিন১০০৪ মাদাগাস্কার সেন্টেলা হিয়ালু-সিকা ওয়াটার-ফিট সান সিরাম SPF50+',
    brand: 'Skin1004',
    category: 'Sunscreen',
    skinTypes: ['Oily', 'Sensitive', 'Combination', 'Dry'],
    price: 1750,
    discountPrice: 1650, // Discounted
    image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600&auto=format&fit=crop&q=60',
    stock: 30,
    description: 'A non-nano chemical sunscreen that blocks UV rays while simultaneously hydrating the skin with Hyalu-Cica formula.',
    descriptionBN: 'একটি নন-ন্যানো কেমিক্যাল সানস্ক্রিন যা ত্বককে ক্ষতিকর রশ্মি থেকে রক্ষা করার পাশাপাশি হিয়ালু-সিকা উপাদানের মাধ্যমে আর্দ্র রাখে।',
    rating: 4.9,
    reviewsCount: 285,
    barcode: '8809530046528',
    qrCodeUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=skin1004-centella-sun-serum',
    is_featured: true,
    ingredients: 'Water, Dibutyl Adipate, Propanediol, Diethylamino Hydroxybenzoyl Hexyl Benzoate, Polymethylsilsesquioxane, Ethylhexyl Triazone'
  },
  {
    id: 'iunik-centella-gel-cream',
    name: 'iUNIK Centella Calming Gel Cream',
    nameBN: 'আইইউনিক সেন্টেলা কামিং জেল ক্রিম',
    brand: 'iUNIK',
    category: 'Moisturizer',
    skinTypes: ['Oily', 'Acne-Prone', 'Sensitive'],
    price: 1550,
    image: 'https://images.unsplash.com/photo-1601049541289-9b1b7bbbfe19?w=600&auto=format&fit=crop&q=60',
    stock: 12,
    description: 'A light and moisturizing gel cream that helps to calm sensitive, stressed, or blemish-prone skin with 72% Centella leaf water and 10% Tea Tree leaf water.',
    descriptionBN: 'একটি হালকা জেল ক্রিম যা ৭২% সেন্টেলা পাতার পানি এবং ১০% টি ট্রি পাতার পানির সাহায্যে সংবেদনশীল বা ব্রণপ্রবণ ত্বক শান্ত করে।',
    rating: 4.7,
    reviewsCount: 84,
    barcode: '8809543500213',
    qrCodeUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=iunik-centella-gel-cream',
    ingredients: 'Centella Asiatica Leaf Water, Melaleuca Alternifolia (Tea Tree) Leaf Water, Butylene Glycol, Water, Niacinamide, Methyl Trimethicone'
  },
  {
    id: 'cosrx-pimple-patch',
    name: 'COSRX Acne Pimple Master Patch (24 patches)',
    nameBN: 'কসআরএক্স ব্রণ পিম্পল মাস্টার প্যাচ (২৪ টি)',
    brand: 'COSRX',
    category: 'Mask',
    skinTypes: ['Acne-Prone', 'Sensitive', 'Normal'],
    price: 350,
    image: 'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=600&auto=format&fit=crop&q=60',
    stock: 50,
    description: 'Hydrocolloid patches that protect wounded or troubled areas of skin from external irritants while extracting impurities to speed healing.',
    descriptionBN: 'হাইড্রোকলয়েড প্যাচ যা ক্ষতিকর ব্যাকটেরিয়া এবং ধুলোবালি থেকে ব্রণকে রক্ষা করে এবং দ্রুত নিরাময় করতে পিম্পলের ভেতরের ময়লা শোষণ করে।',
    rating: 4.8,
    reviewsCount: 310,
    barcode: '8809598450116',
    qrCodeUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=cosrx-pimple-patch',
    ingredients: 'Cellulose Gum, Styrene Isoprene Styrene Block Copolymer, Polyisobutylene, Petroleum Resin, Polyurethane Film'
  }
];

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

import { Product } from '../types';

// Distinct Unsplash images for skincare/beauty categories
const IMAGES = {
  serum: [
    'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600&auto=format&fit=crop&q=60',
    'https://images.unsplash.com/photo-1608248597481-496100c8c836?w=600&auto=format&fit=crop&q=60',
    'https://images.unsplash.com/photo-1601049541289-9b1b7bbbfe19?w=600&auto=format&fit=crop&q=60',
    'https://images.unsplash.com/photo-1617897903246-719242758050?w=600&auto=format&fit=crop&q=60',
    'https://images.unsplash.com/photo-1616683693504-3ea7e9ad6fec?w=600&auto=format&fit=crop&q=60',
    'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=600&auto=format&fit=crop&q=60'
  ],
  cleanser: [
    'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=600&auto=format&fit=crop&q=60',
    'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600&auto=format&fit=crop&q=60',
    'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=600&auto=format&fit=crop&q=60',
    'https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?w=600&auto=format&fit=crop&q=60'
  ],
  sunscreen: [
    'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=600&auto=format&fit=crop&q=60',
    'https://images.unsplash.com/photo-1567928254714-2394e1fd58f5?w=600&auto=format&fit=crop&q=60',
    'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&auto=format&fit=crop&q=60'
  ],
  cream: [
    'https://images.unsplash.com/photo-1556228724-4da53f1283c7?w=600&auto=format&fit=crop&q=60',
    'https://images.unsplash.com/photo-1608248597481-496100c8c836?w=600&auto=format&fit=crop&q=60',
    'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=600&auto=format&fit=crop&q=60'
  ],
  mask: [
    'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=600&auto=format&fit=crop&q=60',
    'https://images.unsplash.com/photo-1512290900676-26c2a48f341d?w=600&auto=format&fit=crop&q=60'
  ],
  lip: [
    'https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=600&auto=format&fit=crop&q=60',
    'https://images.unsplash.com/photo-1616683693504-3ea7e9ad6fec?w=600&auto=format&fit=crop&q=60'
  ],
  bodyHair: [
    'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=600&auto=format&fit=crop&q=60',
    'https://images.unsplash.com/photo-1526947425960-945c6e72858f?w=600&auto=format&fit=crop&q=60'
  ]
};

function getUniqueImage(category: string, index: number, id: string): string {
  let pool = IMAGES.cream;
  const cat = category.toLowerCase();
  if (cat.includes('cleanser') || cat.includes('wash') || cat.includes('foam')) pool = IMAGES.cleanser;
  else if (cat.includes('serum') || cat.includes('essence') || cat.includes('ampoule') || cat.includes('toner')) pool = IMAGES.serum;
  else if (cat.includes('sun') || cat.includes('uv') || cat.includes('screen')) pool = IMAGES.sunscreen;
  else if (cat.includes('mask') || cat.includes('patch')) pool = IMAGES.mask;
  else if (cat.includes('lip')) pool = IMAGES.lip;
  else if (cat.includes('hair') || cat.includes('body') || cat.includes('toothpaste') || cat.includes('oral') || cat.includes('lotion')) pool = IMAGES.bodyHair;
  
  const baseImg = pool[index % pool.length];
  // append unique seed param so each product has its own distinct URL
  return `${baseImg}&sig=${index}_${id}`;
}

export const RAW_PRODUCT_LIST = [
  // COSRX
  { name: 'Cosrx Advance Essence 96', brand: 'COSRX', category: 'Serum & Essence', price: 1850, ml: '100ml', stock: 25, barcode: '8809598450123' },
  { name: 'Cosrx All In One Snail Cream 92', brand: 'COSRX', category: 'Cream & Moisturizer', price: 1950, ml: '100g', stock: 18, barcode: '8809598450147' },
  { name: 'Cosrx Salicylic Acid Daily Gentle Cleanser', brand: 'COSRX', category: 'Cleanser', price: 1250, ml: '150ml', stock: 30, barcode: '8809598450284' },
  { name: 'Cosrx Low PH Good Morning Gel Cleanser', brand: 'COSRX', category: 'Cleanser', price: 1150, ml: '150ml', stock: 42, barcode: '8809598450017' },
  { name: 'COSRX Over Night Spa Mask', brand: 'COSRX', category: 'Mask & Pack', price: 1750, ml: '60ml', stock: 15, barcode: '8809598450321' },
  { name: 'Cosrx Salicylic Acid Cleanser Mini 50ml', brand: 'COSRX', category: 'Cleanser', price: 650, ml: '50ml', stock: 20, barcode: '8809598450413' },
  { name: 'Cosrx Acne Pimple Master Patch', brand: 'COSRX', category: 'Spot Treatment', price: 450, ml: '24 patches', stock: 60, barcode: '8809598450550' },

  // Felicia
  { name: 'Felicia Cleansing Foam Camellia Collagen', brand: 'Felicia', category: 'Cleanser', price: 850, ml: '150ml', stock: 20, barcode: '880980010101' },
  { name: 'Felicia Heartleaf & Madecassoside', brand: 'Felicia', category: 'Serum & Essence', price: 1250, ml: '50ml', stock: 15, barcode: '880980010102' },
  { name: 'Felicia Snail & Ceramide Cleansing Foam', brand: 'Felicia', category: 'Cleanser', price: 850, ml: '150ml', stock: 18, barcode: '880980010103' },
  { name: 'Felicia Retinol & Hyaluronic Acid', brand: 'Felicia', category: 'Serum & Essence', price: 1350, ml: '50ml', stock: 12, barcode: '880980010104' },
  { name: 'Felicia Natural Silk Fit Moisturizing Suncream B5', brand: 'Felicia', category: 'Sunscreen', price: 1150, ml: '50ml', stock: 22, barcode: '880980010105' },
  { name: 'Felicia Natural Silk Fit Moisturizing Suncream Vitamin', brand: 'Felicia', category: 'Sunscreen', price: 1150, ml: '50ml', stock: 20, barcode: '880980010106' },
  { name: 'Felicia Natural Silk Fit Moisturizing Suncream Retinal', brand: 'Felicia', category: 'Sunscreen', price: 1250, ml: '50ml', stock: 15, barcode: '880980010107' },

  // Atomy
  { name: 'Atomy Peeling Gel', brand: 'Atomy', category: 'Exfoliator', price: 1150, ml: '120ml', stock: 14, barcode: '880920020101' },
  { name: 'Atomy Body Care Lotion', brand: 'Atomy', category: 'Body & Hair Care', price: 1450, ml: '300ml', stock: 10, barcode: '880920020102' },
  { name: 'Atomy Hair Tonic', brand: 'Atomy', category: 'Body & Hair Care', price: 1550, ml: '200ml', stock: 12, barcode: '880920020103' },
  { name: 'Atomy Toothpaste 50ml', brand: 'Atomy', category: 'Oral Care', price: 250, ml: '50ml', stock: 50, barcode: '880920020104' },
  { name: 'Atomy Toothpaste 200ml', brand: 'Atomy', category: 'Oral Care', price: 650, ml: '200ml', stock: 35, barcode: '880920020105' },
  { name: 'Atomy Herbal Shampoo', brand: 'Atomy', category: 'Body & Hair Care', price: 1650, ml: '500ml', stock: 16, barcode: '880920020106' },
  { name: 'Atomy Conditioner', brand: 'Atomy', category: 'Body & Hair Care', price: 1650, ml: '500ml', stock: 14, barcode: '880920020107' },
  { name: 'Atomy ScalpCare 2 Set (Shampoo + Conditioner)', brand: 'Atomy', category: 'Body & Hair Care', price: 3200, ml: '500ml x 2', stock: 8, barcode: '880920020108' },
  { name: 'Atomy Toothbrush', brand: 'Atomy', category: 'Oral Care', price: 180, ml: '1 pc', stock: 80, barcode: '880920020109' },
  { name: 'Atomy HemoHIM', brand: 'Atomy', category: 'Supplements', price: 9500, ml: '60 packets', stock: 5, barcode: '880920020110' },
  { name: 'Atomy Korean Red Ginseng Spherical Granule', brand: 'Atomy', category: 'Supplements', price: 6800, ml: '60 ea', stock: 6, barcode: '880920020111' },
  { name: 'Atomy Pomegranate Beauty', brand: 'Atomy', category: 'Supplements', price: 3800, ml: '60 sticks', stock: 8, barcode: '880920020112' },
  { name: 'Atomy Evening Care Set', brand: 'Atomy', category: 'Skincare Set', price: 4200, ml: '4 Items', stock: 7, barcode: '880920020113' },
  { name: 'Atomy Spirulina', brand: 'Atomy', category: 'Supplements', price: 2800, ml: '120 capsules', stock: 10, barcode: '880920020114' },
  { name: 'Atomy Brightteeth Mint Toothpaste', brand: 'Atomy', category: 'Oral Care', price: 450, ml: '100g', stock: 30, barcode: '880920020115' },
  { name: 'Atomy Sensitive Teeth & Gums Toothpaste', brand: 'Atomy', category: 'Oral Care', price: 550, ml: '100g', stock: 25, barcode: '880920020116' },

  // Dabo
  { name: 'Dabo Rice Foam Cleanser', brand: 'Dabo', category: 'Cleanser', price: 750, ml: '180ml', stock: 20, barcode: '880930030101' },
  { name: 'Dabo UV Protection Collagen Lifting Suncream SPF50+ PA+++', brand: 'Dabo', category: 'Sunscreen', price: 950, ml: '70ml', stock: 25, barcode: '880930030102' },
  { name: 'Dabo All In One Collagen Lifting Tone Up Cream', brand: 'Dabo', category: 'Cream & Moisturizer', price: 1150, ml: '100g', stock: 18, barcode: '880930030103' },
  { name: 'Dabo All In One Black Snail Repair Cream 50g', brand: 'Dabo', category: 'Cream & Moisturizer', price: 1050, ml: '50g', stock: 15, barcode: '880930030104' },
  { name: 'Dabo All In One Black Snail Repair Cream 100g', brand: 'Dabo', category: 'Cream & Moisturizer', price: 1650, ml: '100g', stock: 12, barcode: '880930030105' },
  { name: 'Dabo White Sun Block Cream SPF50+ PA+++', brand: 'Dabo', category: 'Sunscreen', price: 850, ml: '70ml', stock: 22, barcode: '880930030106' },

  // SKIN1004
  { name: 'SKIN1004 Madagascar Centella Tone Brightening Capsule Ampoule 30ml', brand: 'SKIN1004', category: 'Serum & Essence', price: 1350, ml: '30ml', stock: 18, barcode: '8809530040101' },
  { name: 'SKIN1004 Madagascar Centella Tone Brightening Capsule Ampoule 100ml', brand: 'SKIN1004', category: 'Serum & Essence', price: 2350, ml: '100ml', stock: 12, barcode: '8809530040102' },
  { name: 'SKIN1004 Madagascar Centella Hyalu-Cica Blue Serum 50ml', brand: 'SKIN1004', category: 'Serum & Essence', price: 1750, ml: '50ml', stock: 15, barcode: '8809530040103' },
  { name: 'SKIN1004 Madagascar Centella Hyalu-Cica Water Fit Sun Serum 50ml', brand: 'SKIN1004', category: 'Sunscreen', price: 1650, ml: '50ml', stock: 25, barcode: '8809530040104' },
  { name: 'SKIN1004 Madagascar Centella Ampoule Foam Cleanser 125ml', brand: 'SKIN1004', category: 'Cleanser', price: 1250, ml: '125ml', stock: 20, barcode: '8809530040105' },
  { name: 'SKIN1004 Madagascar Centella Poremizing Fresh Ampoule 100ml', brand: 'SKIN1004', category: 'Serum & Essence', price: 2250, ml: '100ml', stock: 10, barcode: '8809530040106' },
  { name: 'SKIN1004 Madagascar Centella Probio-Cica Intensive Ampoule 95ml', brand: 'SKIN1004', category: 'Serum & Essence', price: 2450, ml: '95ml', stock: 11, barcode: '8809530040107' },
  { name: 'SKIN1004 Madagascar Centella Light Cleansing Oil 200ml', brand: 'SKIN1004', category: 'Cleanser', price: 1850, ml: '200ml', stock: 16, barcode: '8809530040108' },
  { name: 'SKIN1004 Madagascar Centella Soothing Cream 75ml', brand: 'SKIN1004', category: 'Cream & Moisturizer', price: 1750, ml: '75ml', stock: 14, barcode: '8809530040109' },
  { name: 'SKIN1004 Tone Brightening Capsule Cream 75ml', brand: 'SKIN1004', category: 'Cream & Moisturizer', price: 1850, ml: '75ml', stock: 12, barcode: '8809530040110' },
  { name: 'SKIN1004 Madagascar Centella Probio-Cica Bakuchiol Eye Cream 20ml', brand: 'SKIN1004', category: 'Eye Care', price: 1450, ml: '20ml', stock: 15, barcode: '8809530040111' },

  // Lebelage
  { name: 'Lebelage Natural Toneup Suncream', brand: 'Lebelage', category: 'Sunscreen', price: 750, ml: '70ml', stock: 30, barcode: '880940040101' },
  { name: 'Lebelage Moisture Snail Soothing Gel', brand: 'Lebelage', category: 'Cream & Moisturizer', price: 650, ml: '300ml', stock: 25, barcode: '880940040102' },
  { name: 'Lebelage Aloe Soothing Cleansing Foam', brand: 'Lebelage', category: 'Cleanser', price: 650, ml: '180ml', stock: 28, barcode: '880940040103' },
  { name: 'Lebelage Dr. Vitamin C Derma Ampoule', brand: 'Lebelage', category: 'Serum & Essence', price: 950, ml: '30ml', stock: 15, barcode: '880940040104' },
  { name: 'Lebelage 3 Roller Trouble Spot Cream 30ml', brand: 'Lebelage', category: 'Spot Treatment', price: 850, ml: '30ml', stock: 20, barcode: '880940040105' },
  { name: 'Lebelage 3 Roller Blemish Cream 30ml', brand: 'Lebelage', category: 'Cream & Moisturizer', price: 850, ml: '30ml', stock: 20, barcode: '880940040106' },
  { name: 'Lebelage Dr. CICA Derma Ampoule 30ml', brand: 'Lebelage', category: 'Serum & Essence', price: 950, ml: '30ml', stock: 18, barcode: '880940040107' },
  { name: 'Lebelage Dr. Ceramide Derma Ampoule 30ml', brand: 'Lebelage', category: 'Serum & Essence', price: 950, ml: '30ml', stock: 18, barcode: '880940040108' },
  { name: 'Lebelage Dr. Collagen Derma Ampoule 30ml', brand: 'Lebelage', category: 'Serum & Essence', price: 950, ml: '30ml', stock: 18, barcode: '880940040109' },
  { name: 'Lebelage Cica Propolis Ampoule 30ml', brand: 'Lebelage', category: 'Serum & Essence', price: 950, ml: '30ml', stock: 18, barcode: '880940040110' },

  // Beauty of Joseon
  { name: 'Beauty of Joseon Relief Sun Aqua-Fresh Rice + B5 50ml', brand: 'Beauty of Joseon', category: 'Sunscreen', price: 1650, ml: '50ml', stock: 20, barcode: '8809653240101' },
  { name: 'Beauty of Joseon Revive Eye Serum Ginseng + Retinal', brand: 'Beauty of Joseon', category: 'Eye Care', price: 1750, ml: '30ml', stock: 15, barcode: '8809653240102' },
  { name: 'Beauty of Joseon Glow Serum Propolis + Niacinamide 30ml', brand: 'Beauty of Joseon', category: 'Serum & Essence', price: 1550, ml: '30ml', stock: 22, barcode: '8809653240103' },
  { name: 'Beauty of Joseon Red Bean Water Gel 100ml', brand: 'Beauty of Joseon', category: 'Cream & Moisturizer', price: 1650, ml: '100ml', stock: 14, barcode: '8809653240104' },

  // MISSHA
  { name: 'MISSHA Cotton Sun All Around Safe Block SPF50+ PA++++', brand: 'MISSHA', category: 'Sunscreen', price: 1250, ml: '50ml', stock: 18, barcode: '880950050101' },
  { name: 'MISSHA All Around Safe Block Aqua Sun Gel SPF50+ PA++++ 50ml', brand: 'MISSHA', category: 'Sunscreen', price: 1350, ml: '50ml', stock: 20, barcode: '880950050102' },
  { name: 'Missha All Around Safe Block Soft Finish Sun Milk SPF50+ PA+++ 70ml', brand: 'MISSHA', category: 'Sunscreen', price: 1550, ml: '70ml', stock: 16, barcode: '880950050103' },

  // The Ordinary
  { name: 'The Ordinary Serum', brand: 'The Ordinary', category: 'Serum & Essence', price: 1250, ml: '30ml', stock: 25, barcode: '769915190101' },
  { name: 'The Ordinary Glycolic Acid 7% Exfoliating Toner 240ml', brand: 'The Ordinary', category: 'Toner', price: 1850, ml: '240ml', stock: 18, barcode: '769915190102' },

  // Anua
  { name: 'Anua Heartleaf Pore Control Cleansing Oil 20ml', brand: 'Anua', category: 'Cleanser', price: 550, ml: '20ml', stock: 35, barcode: '8809756120101' },
  { name: 'Anua Heartleaf 77% Soothing Toner 40ml', brand: 'Anua', category: 'Toner', price: 650, ml: '40ml', stock: 30, barcode: '8809756120102' },
  { name: 'Anua Azelaic Acid 10 Hyaluron Redness Soothing Serum 30ml', brand: 'Anua', category: 'Serum & Essence', price: 1950, ml: '30ml', stock: 12, barcode: '8809756120103' },
  { name: 'Anua Rice Enzyme Brightening Cleansing Powder', brand: 'Anua', category: 'Cleanser', price: 1750, ml: '40g', stock: 15, barcode: '8809756120104' },
  { name: 'ANUA Niacinamide 10% + TXA 4% Serum 30ml', brand: 'Anua', category: 'Serum & Essence', price: 2150, ml: '30ml', stock: 14, barcode: '8809756120105' },
  { name: 'Anua Heartleaf Pore Control Cleansing Oil 200ml', brand: 'Anua', category: 'Cleanser', price: 2100, ml: '200ml', stock: 20, barcode: '8809756120106' },
  { name: 'Anua Heartleaf Quercetinol Pore Deep Cleansing Foam 150ml', brand: 'Anua', category: 'Cleanser', price: 1450, ml: '150ml', stock: 22, barcode: '8809756120107' },
  { name: 'Anua Zero-Cast Moisturizing Finish Sunscreen 50ml', brand: 'Anua', category: 'Sunscreen', price: 1850, ml: '50ml', stock: 16, barcode: '8809756120108' },

  // K-Secret
  { name: 'K-Secret Seoul 1988 Serum Retinal Liposome 2% + Black Ginseng 30ml', brand: 'K-Secret', category: 'Serum & Essence', price: 2250, ml: '30ml', stock: 10, barcode: '880960060101' },
  { name: 'K-Secret Seoul 1988 Eye Cream Retinal Liposome 4% + Fermented Bean 30ml', brand: 'K-Secret', category: 'Eye Care', price: 2150, ml: '30ml', stock: 12, barcode: '880960060102' },

  // AXIS-Y
  { name: 'AXIS-Y Dark Spot Correcting Glow Serum 50ml', brand: 'AXIS-Y', category: 'Serum & Essence', price: 1650, ml: '50ml', stock: 25, barcode: '880970070101' },
  { name: 'AXIS-Y Vegan Collagen Eye Serum 10ml', brand: 'AXIS-Y', category: 'Eye Care', price: 1250, ml: '10ml', stock: 15, barcode: '880970070102' },
  { name: 'AXIS-Y Dark Spot Correcting Glow Cream 50ml', brand: 'AXIS-Y', category: 'Cream & Moisturizer', price: 1750, ml: '50ml', stock: 18, barcode: '880970070103' },

  // Lip Masks & Care
  { name: 'CARE:NEL Lip Night Mask 5g', brand: 'CARE:NEL', category: 'Lip Care', price: 350, ml: '5g', stock: 40, barcode: '880980080101' },
  { name: 'JIGOTT Lip Sleeping Mask', brand: 'JIGOTT', category: 'Lip Care', price: 450, ml: '15g', stock: 30, barcode: '880980080102' },
  { name: 'Mediheal Panteno Lips', brand: 'Mediheal', category: 'Lip Care', price: 550, ml: '10ml', stock: 35, barcode: '880980080103' },

  // Care:Nel
  { name: 'CARE:NEL Anti-Melasma Cica Cream 40ml', brand: 'CARE:NEL', category: 'Cream & Moisturizer', price: 1250, ml: '40ml', stock: 15, barcode: '880980080104' },
  { name: 'Care:Nel Anti-Melasma Cica Intensive Serum 30ml', brand: 'CARE:NEL', category: 'Serum & Essence', price: 1350, ml: '30ml', stock: 15, barcode: '880980080105' },
  { name: 'Care:Nel Ceramide Vita B5 Double Barrier Cream 50ml', brand: 'CARE:NEL', category: 'Cream & Moisturizer', price: 1450, ml: '50ml', stock: 12, barcode: '880980080106' },
  { name: 'Care:Nel Cicavita B5 Salicylic Acid Gentle Cleanser 150ml', brand: 'CARE:NEL', category: 'Cleanser', price: 1150, ml: '150ml', stock: 20, barcode: '880980080107' },
  { name: 'Care:Nel High Intensity Anti Hair Loss Scalp Tonic 150ml', brand: 'CARE:NEL', category: 'Body & Hair Care', price: 1650, ml: '150ml', stock: 10, barcode: '880980080108' },

  // IUNIK
  { name: 'IUNIK Centella Calming Gel Cream 60ml', brand: 'IUNIK', category: 'Cream & Moisturizer', price: 1450, ml: '60ml', stock: 18, barcode: '880990090101' },
  { name: 'IUNIK Centella Calming Daily Sunscreen 60ml', brand: 'IUNIK', category: 'Sunscreen', price: 1550, ml: '60ml', stock: 20, barcode: '880990090102' },

  // SOME BY MI
  { name: 'SOME BY MI AHA BHA PHA 30 Days Miracle Serum 50ml', brand: 'SOME BY MI', category: 'Serum & Essence', price: 1750, ml: '50ml', stock: 22, barcode: '880910100101' },

  // Medicube
  { name: 'Medicube PDRN Pink Peptide Serum 30ml', brand: 'Medicube', category: 'Serum & Essence', price: 2850, ml: '30ml', stock: 10, barcode: '880920200101' },
  { name: 'Medicube TXA Niacinamide Capsule Cream', brand: 'Medicube', category: 'Cream & Moisturizer', price: 2950, ml: '50ml', stock: 8, barcode: '880920200102' },
  { name: 'Medicube Collagen Night Wrapping Mask', brand: 'Medicube', category: 'Mask & Pack', price: 2450, ml: '75ml', stock: 12, barcode: '880920200103' },
  { name: 'Medicube Kojic Acid Turmeric Night Wrapping Mask', brand: 'Medicube', category: 'Mask & Pack', price: 2550, ml: '75ml', stock: 10, barcode: '880920200104' },

  // I'm From
  { name: 'I\'m From Rice Sunscreen 50ml', brand: 'I\'m From', category: 'Sunscreen', price: 1850, ml: '50ml', stock: 15, barcode: '880930300101' },
  { name: 'I\'m From Rice Toner 150ml', brand: 'I\'m From', category: 'Toner', price: 2250, ml: '150ml', stock: 18, barcode: '880930300102' },
  { name: 'I\'m From Rice Toner 30ml', brand: 'I\'m From', category: 'Toner', price: 750, ml: '30ml', stock: 25, barcode: '880930300103' },

  // KERASYS
  { name: 'KERASYS Extra Damage Care Shampoo', brand: 'KERASYS', category: 'Body & Hair Care', price: 1150, ml: '600ml', stock: 15, barcode: '880940400101' },
  { name: 'KERASYS Extra Damage Care Conditioner', brand: 'KERASYS', category: 'Body & Hair Care', price: 1150, ml: '600ml', stock: 15, barcode: '880940400102' },

  // Mary & May / Farmstay / PURITO / RAIP
  { name: 'Mary & May Glutathione Eye Cream 30ml', brand: 'Mary & May', category: 'Eye Care', price: 1450, ml: '30ml', stock: 14, barcode: '880950500101' },
  { name: 'Farmstay Collagen & Hyaluronic Acid All-In-One Ampoule', brand: 'Farmstay', category: 'Serum & Essence', price: 1250, ml: '250ml', stock: 20, barcode: '880950500102' },
  { name: 'PURITO SEOUL Mighty Bamboo Panthenol Cream 100ml', brand: 'PURITO', category: 'Cream & Moisturizer', price: 1950, ml: '100ml', stock: 12, barcode: '880950500103' },
  { name: 'RAIP Hair Argan Oil 100ml', brand: 'RAIP', category: 'Body & Hair Care', price: 850, ml: '100ml', stock: 25, barcode: '880950500104' },

  // 3W Clinic, May Island, Pure Ground
  { name: '3W Clinic Lavender Daily Body Lotion', brand: '3W Clinic', category: 'Body & Hair Care', price: 850, ml: '500ml', stock: 20, barcode: '880960600101' },
  { name: 'May Island Ultra Brightening Sun Protection SPF50+ PA+++', brand: 'May Island', category: 'Sunscreen', price: 750, ml: '70ml', stock: 22, barcode: '880960600102' },
  { name: 'Pure Ground Glutathione Tone-Up Sunscreen 70ml', brand: 'Pure Ground', category: 'Sunscreen', price: 950, ml: '70ml', stock: 18, barcode: '880960600103' },
  { name: '3W Clinic Underarm Whitening', brand: '3W Clinic', category: 'Body & Hair Care', price: 650, ml: '50g', stock: 25, barcode: '880960600104' },

  // Sheet Masks
  { name: 'Green Tea Ultra Hydrating Essence Mask', brand: 'Korea Beauty', category: 'Mask & Pack', price: 120, ml: '25g', stock: 100, barcode: '880970700101' },
  { name: 'Cucumber Real Essence Mask', brand: 'Korea Beauty', category: 'Mask & Pack', price: 120, ml: '25g', stock: 100, barcode: '880970700102' },
  { name: 'White Real Essence Mask', brand: 'Korea Beauty', category: 'Mask & Pack', price: 120, ml: '25g', stock: 100, barcode: '880970700103' },
  { name: 'Snail Real Essence Mask', brand: 'Korea Beauty', category: 'Mask & Pack', price: 120, ml: '25g', stock: 100, barcode: '880970700104' },

  // Heeyul, Noblesse, Skin Soop, Luxtree, Cha-Skin
  { name: 'Collagen Real Essence Mask', brand: 'Korea Beauty', category: 'Mask & Pack', price: 120, ml: '25g', stock: 100, barcode: '880970700105' },
  { name: 'Heeyul Bio Anti Hair Tonic', brand: 'Heeyul', category: 'Body & Hair Care', price: 1450, ml: '150ml', stock: 12, barcode: '880980800101' },
  { name: 'Noblesse Premium Spot Gel', brand: 'Noblesse', category: 'Spot Treatment', price: 850, ml: '30ml', stock: 15, barcode: '880980800102' },
  { name: 'Noblesse Vitamin Essence', brand: 'Noblesse', category: 'Serum & Essence', price: 950, ml: '50ml', stock: 15, barcode: '880980800103' },
  { name: 'Noblesse Sweet Snail Wrinkle Cream', brand: 'Noblesse', category: 'Cream & Moisturizer', price: 1150, ml: '50g', stock: 15, barcode: '880980800104' },
  { name: 'Skin Soop Collagen Cream', brand: 'Skin Soop', category: 'Cream & Moisturizer', price: 950, ml: '50g', stock: 18, barcode: '880980800105' },
  { name: 'Luxtree Collagen Moisturizing Cream 100ml', brand: 'Luxtree', category: 'Cream & Moisturizer', price: 1250, ml: '100ml', stock: 15, barcode: '880980800106' },
  { name: 'Cha-Skin CC Cream', brand: 'Cha-Skin', category: 'Makeup & Tone-Up', price: 850, ml: '50g', stock: 20, barcode: '880980800107' },
  { name: 'Cha-Skin Eye Cream', brand: 'Cha-Skin', category: 'Eye Care', price: 750, ml: '30ml', stock: 20, barcode: '880980800108' }
];

export const INITIAL_PRODUCTS: Product[] = RAW_PRODUCT_LIST.map((item, idx) => {
  const id = item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const image = getUniqueImage(item.category, idx, id);
  return {
    id,
    name: item.name,
    nameBN: `${item.name} (অথেনটিক কোরিয়ান প্রোডাক্ট)`,
    brand: item.brand,
    category: item.category,
    skinTypes: ['All Skin Types', 'Sensitive', 'Combination'],
    price: item.price,
    ml: item.ml,
    image,
    stock: item.stock,
    description: `100% Authentic ${item.name} by ${item.brand}. Sourced directly from South Korea for Korean Skin Food BD customers. Ideal for healthy, glowing skin.`,
    descriptionBN: `১০০% অরিজিনাল কোরিয়ান ${item.name}। কোরিয়ান স্কিন ফুড বিডি থেকে সেরা মূল্যে কিনুন।`,
    rating: Number((4.5 + (idx % 5) * 0.1).toFixed(1)),
    reviewsCount: 15 + (idx % 40),
    barcode: item.barcode,
    qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${id}`,
    isSlowMoving: item.stock > 35
  };
});

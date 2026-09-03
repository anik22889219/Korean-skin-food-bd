import React, { useRef, useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Check, Sparkles, ShieldCheck, ArrowRight, Globe, Truck, Award, Heart } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { Product } from '../types';

interface ShowcaseItem {
  id: string;
  name: string;
  priceUSD: number;
  priceBDT: number;
  category: string;
  image: string;
  subtitle?: string;
}

const HERITAGE_ESSENTIALS: ShowcaseItem[] = [
  {
    id: 'heritage-1',
    name: 'Ginseng Cleansing Oil',
    priceUSD: 48.0,
    priceBDT: 5800,
    category: 'Cleanser',
    subtitle: 'Nourishing & Purifying',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDygV0BUx3FRHwpnDvTSsMsiG1TsjcGBgKWE8vEsaUi5TRYTM-pzc4wgYwMs1-n-Zhv04YeC1al6FBGnOFf_6_JQacp8mUx8Ulk8cq0QFnA00nmiBUQLfC9i-UHYH8n1G4DJHoiA_X068q3nfC_i0QcK_uvJUfOM9DwxqtR7yczoZ1zTqwlvm5NeEUFPH0wHNqWT_LD9F3Xhgc2VREFAublAEJzOmy0z83LwvQ2vyOXHKxK4YZ77Q_Me3PJ_GIUl8BRSicxciMdpqM'
  },
  {
    id: 'heritage-2',
    name: 'Fermented Rice Serum',
    priceUSD: 62.0,
    priceBDT: 7450,
    category: 'Serum',
    subtitle: 'Luminosity & Elasticity',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCgpqTQgZYXgKUkN6o1SsWplJBH8NvtdkkURiY9HqR2Dp5EzELgoBYJeirZB8yvJ-lzvKkPFLLXax2xGGO0XD_AeOqMkt3c6xp5i06Coe_7rWAfOHKSnL8Ou7YHVjqPicBnKcSPai1_9540Lo-bunSgSMODzzWoXsImvjKuGYRshM4Px7Z46MZx_56iNMm8Ge96CTluUtHdm28rog9DZOtedYJp43WZuvFVeB1y6119UVdU2-E9ymYgKCAm8TMAkAYvy7bpGYoT46I'
  },
  {
    id: 'heritage-3',
    name: 'Camellia Sleeping Mask',
    priceUSD: 55.0,
    priceBDT: 6600,
    category: 'Mask',
    subtitle: 'Overnight Barrier Renewal',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDgTQaRbZixVhXln6so0dlGREA6GdOxL6yXvgemYepAqppVLtsFcT0lRhGmgb8mpDma_IiHb7ErIK9YUuAZXa8U9kNLaekLj18qSdqCKTaCfeAVxfPF-05iV1Nu3l90UqgsNet-NpGGNXu5KPSvsedYRNoJRT9k5Stmh0y2DcctzfMcWIo9blVPY-pwRvwpbXnAWL3OLX1kyUSTF6AdswBgZ8Dmczc8DTQh0mhesKKKhqlRUpNG8Vz86KG0i9btEXetVjx8yVx1mUo'
  },
  {
    id: 'heritage-4',
    name: 'Green Tea Tincture',
    priceUSD: 42.0,
    priceBDT: 5050,
    category: 'Toner',
    subtitle: 'Antioxidant Calming Elixir',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD6vSS8IAHvxnL_OZ3sEB7rTece_ypiqy2nRqWiqV-Rw8V-fYFH4c-ByE7fQ9KD5Nhw_0jAJfYWD_CSMaoEu22IIKLRKVdf0_CfP_9sEbKJGYEyd5BfAsbMnHgj8kzbStrV7p3mgKhNEQ_WArQV5ud1YEqdj7GioWGS3JoUo-Py4ubbB5YXNKGC5GYFEXBuxc52KRyK13TM083bsn1UXb_WRr5Frdwr3Ya4XYaGwoTaSmUsuTBYk7fMWLU-l8EgMJu6sCVMdfGotNI'
  }
];

const VALIDATED_FORMULATIONS: ShowcaseItem[] = [
  {
    id: 'val-1',
    name: 'Centella Repair Cream',
    priceUSD: 74.0,
    priceBDT: 8900,
    category: 'Moisturizer',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCVySvNsYG6RFEynasCzuPyDD8rusS84mfYyPW56DnvMJsK--qRK4mgCs1Ngdw8h0YhR_Da7rZtXEx-bap68883mcCWSb4KozrXbopvo4T3FZMmqEE4LGjxyY6shubMeXYRhMdShwfUUQ1RGld2ONlirKF8Sgp7bjO2pY70JCGASzerVSsFq-9Ve2DkraqsQZh7nG9JGsRrnwr-DPjT9d51pTJC2Bz2RHggqsfL7gPQryBAqHgI94-dsSexnpOnYTQPTo9dPPSZdpY'
  },
  {
    id: 'val-2',
    name: 'Deep Hydration Mist',
    priceUSD: 36.0,
    priceBDT: 4300,
    category: 'Mist',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCsU_XTcOydrioCuy6mHIZedJtGV3TCRDrVSlwVPpsfYOfQloKy1qznJZTKH3Xq6R-ugsETs8yKfKmPyOgAtCPMwWmDzeGGbEGQp9sQ6xmKKDH8qTWq8omZth-pATb0Bil74mpy055B_LoLYxLZLzTduYUi-fRwwOsCuDTVmmnn2meqqsZ4noBissSJB9AJlGbe_0a6Fo-OCmmXIEadhOXzO9gy2SEZvowvnKOoqO6hr4uC4kA7MNUwzFHqGHa6o1OUi3JLlgCnFiY'
  },
  {
    id: 'val-3',
    name: 'Bamboo Peeling Gel',
    priceUSD: 52.0,
    priceBDT: 6250,
    category: 'Exfoliator',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDmn3wly8UL5fVifoYvSQUmPLv2SdMjpqgJ_mhO5gAjK14IcNcKDAO-YfKLi-lCKZ8Afo6mhLQa69Jzb60PR6TT4BdBC_K5b4VC2uKlahiFIGCwkj5YESsxgz3PAfnCis1vWPqwagFwXH1aKFv3WCtUSFBpd0TYyeSw8PDMM6tJdtyEDT2LcmggftIygChvbDGpR98mArQKFT--Zo9CgurQHiVxdqlDn8hqepgA3KSH3anTPDI0HWEhqXV_HjT7nB6xIjFVllK45VQ'
  }
];

const PARTNERSHIP_SELECTION: ShowcaseItem[] = [
  {
    id: 'part-1',
    name: 'Mugwort Essence',
    priceUSD: 45.0,
    priceBDT: 5400,
    category: 'Essence',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDygV0BUx3FRHwpnDvTSsMsiG1TsjcGBgKWE8vEsaUi5TRYTM-pzc4wgYwMs1-n-Zhv04YeC1al6FBGnOFf_6_JQacp8mUx8Ulk8cq0QFnA00nmiBUQLfC9i-UHYH8n1G4DJHoiA_X068q3nfC_i0QcK_uvJUfOM9DwxqtR7yczoZ1zTqwlvm5NeEUFPH0wHNqWT_LD9F3Xhgc2VREFAublAEJzOmy0z83LwvQ2vyOXHKxK4YZ77Q_Me3PJ_GIUl8BRSicxciMdpqM'
  },
  {
    id: 'part-2',
    name: 'Snail Mucin Toner',
    priceUSD: 38.0,
    priceBDT: 4550,
    category: 'Toner',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCgpqTQgZYXgKUkN6o1SsWplJBH8NvtdkkURiY9HqR2Dp5EzELgoBYJeirZB8yvJ-lzvKkPFLLXax2xGGO0XD_AeOqMkt3c6xp5i06Coe_7rWAfOHKSnL8Ou7YHVjqPicBnKcSPai1_9540Lo-bunSgSMODzzWoXsImvjKuGYRshM4Px7Z46MZx_56iNMm8Ge96CTluUtHdm28rog9DZOtedYJp43WZuvFVeB1y6119UVdU2-E9ymYgKCAm8TMAkAYvy7bpGYoT46I'
  },
  {
    id: 'part-3',
    name: 'Honey Glow Mask',
    priceUSD: 42.0,
    priceBDT: 5050,
    category: 'Mask',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCsU_XTcOydrioCuy6mHIZedJtGV3TCRDrVSlwVPpsfYOfQloKy1qznJZTKH3Xq6R-ugsETs8yKfKmPyOgAtCPMwWmDzeGGbEGQp9sQ6xmKKDH8qTWq8omZth-pATb0Bil74mpy055B_LoLYxLZLzTduYUi-fRwwOsCuDTVmmnn2meqqsZ4noBissSJB9AJlGbe_0a6Fo-OCmmXIEadhOXzO9gy2SEZvowvnKOoqO6hr4uC4kA7MNUwzFHqGHa6o1OUi3JLlgCnFiY'
  },
  {
    id: 'part-4',
    name: 'Ginger Eye Cream',
    priceUSD: 58.0,
    priceBDT: 6950,
    category: 'Eye Care',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDmn3wly8UL5fVifoYvSQUmPLv2SdMjpqgJ_mhO5gAjK14IcNcKDAO-YfKLi-lCKZ8Afo6mhLQa69Jzb60PR6TT4BdBC_K5b4VC2uKlahiFIGCwkj5YESsxgz3PAfnCis1vWPqwagFwXH1aKFv3WCtUSFBpd0TYyeSw8PDMM6tJdtyEDT2LcmggftIygChvbDGpR98mArQKFT--Zo9CgurQHiVxdqlDn8hqepgA3KSH3anTPDI0HWEhqXV_HjT7nB6xIjFVllK45VQ'
  }
];

const BESTSELLING_RITUALS: ShowcaseItem[] = [
  {
    id: 'best-1',
    name: 'Jeju Orchid Serum',
    priceUSD: 88.0,
    priceBDT: 10500,
    category: 'Serum',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDygV0BUx3FRHwpnDvTSsMsiG1TsjcGBgKWE8vEsaUi5TRYTM-pzc4wgYwMs1-n-Zhv04YeC1al6FBGnOFf_6_JQacp8mUx8Ulk8cq0QFnA00nmiBUQLfC9i-UHYH8n1G4DJHoiA_X068q3nfC_i0QcK_uvJUfOM9DwxqtR7yczoZ1zTqwlvm5NeEUFPH0wHNqWT_LD9F3Xhgc2VREFAublAEJzOmy0z83LwvQ2vyOXHKxK4YZ77Q_Me3PJ_GIUl8BRSicxciMdpqM'
  },
  {
    id: 'best-2',
    name: 'Royal Propolis Cream',
    priceUSD: 95.0,
    priceBDT: 11400,
    category: 'Cream',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCDoVlcveeL6BbwjoPCSbobXaTJNM7TReLGuvKIDqAww26XR9QQRoxioriDwqJX-rz_iYd6RzLU9fpSkmouWRdPs-RxzDBx9KXq6Gw9RaJClhEdfrjxUnbLcn4Leh86-VBAoMo0HU-cXhstTVHf6u9upQQp-6oLgFYn3DBG5gIM__U_j5Tpv4Ro9OlsdMQal2xN_G9_nR1CxbvMd3ImUogiiXR2czFJYcmFDC5DOVa81SzcVALZk7Ow2iCzsJsc_M3UNRjEUNYhZhA'
  },
  {
    id: 'best-3',
    name: 'Gold Volcanic Scrub',
    priceUSD: 64.0,
    priceBDT: 7700,
    category: 'Scrub',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD6vSS8IAHvxnL_OZ3sEB7rTece_ypiqy2nRqWiqV-Rw8V-fYFH4c-ByE7fQ9KD5Nhw_0jAJfYWD_CSMaoEu22IIKLRKVdf0_CfP_9sEbKJGYEyd5BfAsbMnHgj8kzbStrV7p3mgKhNEQ_WArQV5ud1YEqdj7GioWGS3JoUo-Py4ubbB5YXNKGC5GYFEXBuxc52KRyK13TM083bsn1UXb_WRr5Frdwr3Ya4XYaGwoTaSmUsuTBYk7fMWLU-l8EgMJu6sCVMdfGotNI'
  }
];

// Subtle editorial animation variants
const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (custom: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.8,
      delay: custom * 0.1,
      ease: [0.16, 1, 0.3, 1]
    }
  })
};

const fadeIn = {
  hidden: { opacity: 0 },
  visible: (custom: number = 0) => ({
    opacity: 1,
    transition: {
      duration: 0.9,
      delay: custom * 0.1,
      ease: [0.16, 1, 0.3, 1]
    }
  })
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.08
    }
  }
};

export const AboutUs: React.FC = () => {
  const navigate = useNavigate();
  const { addToCart, setIsCartOpen } = useCart();
  const carouselRef = useRef<HTMLDivElement>(null);
  const foundersStoryRef = useRef<HTMLDivElement>(null);
  const [addedItem, setAddedItem] = useState<string | null>(null);

  const scrollCarousel = (direction: 'left' | 'right') => {
    if (carouselRef.current) {
      const scrollAmount = direction === 'left' ? -340 : 340;
      carouselRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const scrollToStory = () => {
    foundersStoryRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleQuickAdd = (item: ShowcaseItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const productAdapter: Product = {
      id: item.id,
      name: item.name,
      nameBN: item.name,
      brand: 'Korean Skin Food',
      category: item.category,
      skinTypes: ['All Skin Types'],
      price: item.priceBDT,
      image: item.image,
      stock: 50,
      description: `${item.name} - Botanical Heritage formulation sourced directly from Seoul.`,
      descriptionBN: `${item.name} - সিউল থেকে সরাসরি সংগৃহীত প্রিমিয়াম ফর্মুলেশন।`,
      rating: 5,
      reviewsCount: 18,
      barcode: `KSF-${item.id.toUpperCase()}`,
      qrCodeUrl: ''
    };
    
    addToCart(productAdapter);
    setAddedItem(item.id);
    setTimeout(() => {
      setAddedItem(null);
    }, 1800);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
      className="w-full bg-[#fff8f5] text-[#1e1b18] font-sans-editorial overflow-hidden -mt-6 sm:-mt-8"
    >
      {/* 1. HERO SECTION: The Ritual of Light */}
      <section className="relative min-h-[820px] lg:min-h-[920px] flex items-center justify-start overflow-hidden">
        <div className="absolute inset-0 z-0 overflow-hidden">
          <motion.img
            initial={{ scale: 1.08, opacity: 0.8 }}
            animate={{ scale: 1.02, opacity: 1 }}
            transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuDygV0BUx3FRHwpnDvTSsMsiG1TsjcGBgKWE8vEsaUi5TRYTM-pzc4wgYwMs1-n-Zhv04YeC1al6FBGnOFf_6_JQacp8mUx8Ulk8cq0QFnA00nmiBUQLfC9i-UHYH8n1G4DJHoiA_X068q3nfC_i0QcK_uvJUfOM9DwxqtR7yczoZ1zTqwlvm5NeEUFPH0wHNqWT_LD9F3Xhgc2VREFAublAEJzOmy0z83LwvQ2vyOXHKxK4YZ77Q_Me3PJ_GIUl8BRSicxciMdpqM"
            alt="The Ritual of Light - Korean Skin Food Partnership"
            className="w-full h-full object-cover object-center"
            referrerPolicy="no-referrer"
          />
          {/* Subtle Warm Cinematic Overlays */}
          <div className="absolute inset-0 bg-black/25" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#fff8f5]/90 via-[#fff8f5]/50 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#fff8f5] via-transparent to-transparent" />

          {/* Minimalist Carousel Progress Indicators */}
          <div className="absolute bottom-12 left-6 md:left-20 flex items-center gap-3 z-20">
            <div className="w-12 h-[2px] bg-[#5e5f5c]" />
            <div className="w-12 h-[2px] bg-[#c5c7c1]/40" />
            <div className="w-12 h-[2px] bg-[#c5c7c1]/40" />
          </div>
        </div>

        <div className="relative z-10 w-full max-w-[1440px] mx-auto px-6 md:px-12 lg:px-20 py-24">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="max-w-2xl space-y-6"
          >
            <motion.p
              variants={fadeInUp}
              custom={0}
              className="text-xs md:text-sm font-medium tracking-[0.3em] uppercase text-[#5e5f5c]"
            >
              The Ritual of Light
            </motion.p>
            <motion.h1
              variants={fadeInUp}
              custom={1}
              className="font-serif-luxury text-4xl sm:text-6xl md:text-7xl lg:text-[80px] font-normal leading-[1.1] tracking-tight text-[#1e1b18]"
            >
              Authentic Beauty. <br />
              <span className="italic font-light">Validated Roots.</span>
            </motion.h1>
            <motion.p
              variants={fadeInUp}
              custom={2}
              className="text-sm md:text-base text-[#454843] font-light leading-relaxed max-w-lg"
            >
              Bridging Seoul&apos;s timeless botanical wisdom with Bangladesh&apos;s distinct skin rituals through direct manufacturer provenance and certified laboratory integrity.
            </motion.p>
            <motion.div
              variants={fadeInUp}
              custom={3}
              className="pt-4 flex flex-wrap gap-4"
            >
              <button
                id="btn-discover-heritage"
                onClick={scrollToStory}
                className="border border-[#757873] px-10 py-4 text-xs font-semibold uppercase tracking-widest text-[#1e1b18] hover:bg-[#1e1b18] hover:text-[#fff8f5] transition-all duration-500 cursor-pointer rounded-none"
              >
                Discover Our Heritage
              </button>
              <button
                id="btn-hero-catalog"
                onClick={() => navigate('/shop')}
                className="bg-[#5b6056] text-white px-8 py-4 text-xs font-semibold uppercase tracking-widest hover:bg-[#44483f] transition-all duration-300 cursor-pointer rounded-none shadow-sm"
              >
                Explore Catalog
              </button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* 2. OUR FOUNDERS' STORY: A Legacy of Love & Light */}
      <section ref={foundersStoryRef} className="py-20 lg:py-32 bg-[#fff8f5]">
        <div className="max-w-[1440px] mx-auto px-6 md:px-12 lg:px-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            {/* Left Image with Luxury Border Frame & Est. 2014 Badge */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              variants={fadeIn}
              className="lg:col-span-6 relative"
            >
              <div className="aspect-[4/5] overflow-hidden border-[10px] md:border-[14px] border-white shadow-2xl relative bg-white">
                <img
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuBOzj3L4E3LOsKUDd0DevhbePBhoN3Ar8wYAQm_f5w6DkiNR5L2FUJvU6W-27PQtA2rOxk-v1sV4q3HMHdQGm-j3ilMcval8tFJTyxwscNNsucABHWJbNLEzSdKS2ILYoBSJlaVLJN2SbyIQVdX1bhfh3woUNckwmO8_j8Vn8NdShxGN28-fwVhO2Kko2WnVffR4ROmOGKrLWwk6e-AFvApBzdGE2fX_bcr_xzL7eB6MfDEIHP-LPaeIGxPa89Hq4dqPpC0B7S95Mw"
                  alt="Founders of Korean Skin Food"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="absolute -bottom-6 -right-4 md:-bottom-8 md:-right-8 bg-[#5b6056] text-white p-6 md:p-8 shadow-xl"
              >
                <p className="font-serif-luxury text-xl md:text-2xl italic tracking-wide">Est. 2014</p>
              </motion.div>
            </motion.div>

            {/* Right Story Narrative */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              variants={staggerContainer}
              className="lg:col-span-6 space-y-8"
            >
              <motion.div variants={fadeInUp}>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5b6056] mb-3">
                  Our Founders&apos; Story
                </p>
                <h2 className="font-serif-luxury text-3xl sm:text-4xl md:text-5xl font-normal text-[#1e1b18] leading-tight">
                  A Legacy of Love &amp; Light
                </h2>
              </motion.div>

              <motion.blockquote
                variants={fadeInUp}
                custom={1}
                className="font-serif-luxury italic text-lg md:text-xl text-[#454843] leading-relaxed border-l-2 border-[#5e5f5c]/30 pl-6 py-1"
              >
                &ldquo;We didn&apos;t just want to create another skincare brand. We wanted to build a bridge—a way to share the timeless wisdom of Korean botanical traditions with a modern world seeking authenticity.&rdquo;
              </motion.blockquote>

              <motion.p
                variants={fadeInUp}
                custom={2}
                className="text-sm md:text-base text-[#454843] font-light leading-relaxed"
              >
                Born from a shared passion for pure ingredients and rigorous standards, Korean Skin Food began as a small initiative to bring high-potency, ethically sourced heritage ingredients to global markets. Today, our founders remain deeply involved in every step of the &apos;Ritual of Light&apos;.
              </motion.p>

              <motion.div
                variants={fadeInUp}
                custom={3}
                className="flex items-center gap-6 pt-4"
              >
                <div className="w-16 h-[1px] bg-[#5e5f5c]/40" />
                <span className="text-xs font-semibold uppercase tracking-[0.25em] text-[#5e5f5c]">
                  The Heritage Council
                </span>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 3. HERITAGE FAVORITES: Botanical Essentials */}
      <section className="py-20 bg-[#fff8f5] border-t border-[#c5c7c1]/30">
        <div className="max-w-[1440px] mx-auto px-6 md:px-12 lg:px-20">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-40px" }}
            variants={fadeInUp}
            className="flex justify-between items-end mb-12"
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5e5f5c] mb-2">
                Heritage Favorites
              </p>
              <h2 className="font-serif-luxury text-3xl md:text-4xl font-normal text-[#1e1b18]">
                Botanical Essentials
              </h2>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => scrollCarousel('left')}
                className="w-11 h-11 border border-[#c5c7c1] flex items-center justify-center text-[#1e1b18] hover:bg-[#5b6056] hover:text-white hover:border-[#5b6056] transition-colors duration-300 cursor-pointer"
                aria-label="Previous Products"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={() => scrollCarousel('right')}
                className="w-11 h-11 border border-[#c5c7c1] flex items-center justify-center text-[#1e1b18] hover:bg-[#5b6056] hover:text-white hover:border-[#5b6056] transition-colors duration-300 cursor-pointer"
                aria-label="Next Products"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </motion.div>

          {/* Horizontal Scrollable Product Track */}
          <motion.div
            ref={carouselRef}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-40px" }}
            variants={staggerContainer}
            className="flex gap-6 overflow-x-auto scrollbar-none pb-6 scroll-smooth snap-x"
          >
            {HERITAGE_ESSENTIALS.map((prod, index) => (
              <motion.div
                key={prod.id}
                variants={fadeInUp}
                custom={index}
                onClick={() => navigate('/shop')}
                className="min-w-[280px] sm:min-w-[320px] flex-1 group cursor-pointer snap-start"
              >
                <div className="aspect-[3/4] bg-[#f5ece7] mb-5 overflow-hidden relative border border-[#c5c7c1]/20">
                  <img
                    src={prod.image || 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&q=80&w=400'}
                    alt={prod.name}
                    className="w-full h-full object-cover mix-blend-multiply opacity-90 group-hover:scale-105 transition-transform duration-700"
                    referrerPolicy="no-referrer"
                  />
                  {/* Slide-Up Add to Bag Button */}
                  <div className="absolute bottom-0 left-0 w-full p-3.5 bg-[#1e1b18]/90 text-[#fff8f5] text-center text-xs font-semibold uppercase tracking-widest opacity-0 group-hover:opacity-100 transform translate-y-3 group-hover:translate-y-0 transition-all duration-300 flex items-center justify-center gap-2">
                    {addedItem === prod.id ? (
                      <>
                        <Check size={14} className="text-emerald-400" />
                        <span>Added to Bag</span>
                      </>
                    ) : (
                      <span onClick={(e) => handleQuickAdd(prod, e)}>Add to Bag</span>
                    )}
                  </div>
                </div>
                <h3 className="font-serif-luxury text-xl text-[#1e1b18] mb-1 group-hover:text-[#5b6056] transition-colors">
                  {prod.name}
                </h3>
                <div className="flex items-center justify-between">
                  <p className="text-xs tracking-wider uppercase text-[#5e5f5c] font-medium">
                    ${prod.priceUSD.toFixed(2)} <span className="text-[11px] text-[#454843]/60">/ ৳ {prod.priceBDT.toLocaleString()}</span>
                  </p>
                  <span className="text-[10px] uppercase tracking-widest text-[#5b6056] bg-[#e0e4d7] px-2 py-0.5">
                    {prod.category}
                  </span>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* 4. QUALITY ASSURANCE: A Global Standard of Integrity */}
      <section className="py-20 lg:py-32 bg-[#fff8f5]">
        <div className="max-w-[1440px] mx-auto px-6 md:px-12 lg:px-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            {/* Left Content */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              variants={staggerContainer}
              className="lg:col-span-5 space-y-8"
            >
              <motion.div variants={fadeInUp}>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5e5f5c] mb-3">
                  Quality Assurance
                </p>
                <h2 className="font-serif-luxury text-3xl sm:text-4xl md:text-5xl font-normal text-[#1e1b18] leading-tight">
                  A Global Standard of Integrity
                </h2>
              </motion.div>
              <motion.p
                variants={fadeInUp}
                custom={1}
                className="text-sm md:text-base text-[#454843] font-light leading-relaxed"
              >
                Beyond formulation, we control every step of the journey. From our certified sorting facilities to climate-controlled transit, we ensure the botanical integrity of our products remains uncompromised from Korea to the world.
              </motion.p>

              <motion.div
                variants={staggerContainer}
                className="space-y-6 pt-2"
              >
                <motion.div
                  variants={fadeInUp}
                  custom={2}
                  className="flex items-start gap-6 border-b border-[#c5c7c1]/40 pb-6"
                >
                  <span className="font-serif-luxury text-4xl text-[#c5c7c1] font-light">01</span>
                  <div className="space-y-1">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#1e1b18]">
                      Inventory Precision
                    </h3>
                    <p className="text-xs md:text-sm text-[#454843] font-light leading-relaxed">
                      Our warehouse operations utilize rigorous batch tracking to guarantee freshness and potency for every client.
                    </p>
                  </div>
                </motion.div>

                <motion.div
                  variants={fadeInUp}
                  custom={3}
                  className="flex items-start gap-6 border-b border-[#c5c7c1]/40 pb-6"
                >
                  <span className="font-serif-luxury text-4xl text-[#c5c7c1] font-light">02</span>
                  <div className="space-y-1">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#1e1b18]">
                      Direct Logistics
                    </h3>
                    <p className="text-xs md:text-sm text-[#454843] font-light leading-relaxed">
                      Proprietary cargo solutions eliminate third-party handling, preserving the sanctuary of our ingredients.
                    </p>
                  </div>
                </motion.div>
              </motion.div>
            </motion.div>

            {/* Right Warehouse Logistics Image & Overlapping Note */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              variants={fadeIn}
              className="lg:col-span-6 lg:col-start-7 relative"
            >
              <div className="aspect-[4/5] overflow-hidden shadow-2xl border border-white/60">
                <img
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuDH2LoWWo-SbNTwCqrFgUFpyUtVIC9bOI4Zrj135WguZql4fmOPsK8prr_BbxhLktvvOYy1p5wcEO-eTQ9gubPk5aAVaAjigFYYRbHd3YWd6mJcuyDCq8xe5nPFfIV8ss6_O9l7aGuEyE31MHKopI2hkkbjfu_ZryYj0sTdLmwoWVkbRkUEdUQue37h2ArOZx_BhXszbrBVFJh_upJcr__mTcIGmbqDPZ8ulsEwInSslEAURYbPnhcJzD3WRyfortj_I1smJazHTV8"
                  alt="Logistics Integrity and International Cargo"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>

              {/* Floating Glassmorphism Operations Note */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: 0.3 }}
                className="hidden sm:block absolute -bottom-8 -left-8 md:-left-12 w-64 md:w-72 glass-card p-6 shadow-xl border border-white/80"
              >
                <img
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuCDoVlcveeL6BbwjoPCSbobXaTJNM7TReLGuvKIDqAww26XR9QQRoxioriDwqJX-rz_iYd6RzLU9fpSkmouWRdPs-RxzDBx9KXq6Gw9RaJClhEdfrjxUnbLcn4Leh86-VBAoMo0HU-cXhstTVHf6u9upQQp-6oLgFYn3DBG5gIM__U_j5Tpv4Ro9OlsdMQal2xN_G9_nR1CxbvMd3ImUogiiXR2czFJYcmFDC5DOVa81SzcVALZk7Ow2iCzsJsc_M3UNRjEUNYhZhA"
                  alt="Inventory Pallet Precision"
                  className="w-full h-28 object-cover mb-3"
                  referrerPolicy="no-referrer"
                />
                <p className="text-[11px] font-semibold italic text-[#5e5f5c] tracking-widest uppercase mb-1">
                  Operations Note
                </p>
                <p className="text-xs text-[#1e1b18] font-light leading-relaxed">
                  &ldquo;Our reach is global, but our standard is singular. We treat every shipment as a ritual of trust.&rdquo;
                </p>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 5. PRECISION SCIENCE: Validated Formulations */}
      <section className="py-20 lg:py-28 bg-[#fbf2ed]">
        <div className="max-w-[1440px] mx-auto px-6 md:px-12 lg:px-20">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-40px" }}
            variants={staggerContainer}
            className="text-center max-w-2xl mx-auto mb-16 space-y-3"
          >
            <motion.p
              variants={fadeInUp}
              className="text-xs font-semibold uppercase tracking-[0.25em] text-[#5e5f5c]"
            >
              Precision Science
            </motion.p>
            <motion.h2
              variants={fadeInUp}
              custom={1}
              className="font-serif-luxury text-3xl sm:text-4xl md:text-5xl font-normal text-[#1e1b18]"
            >
              Validated Formulations
            </motion.h2>
            <motion.p
              variants={fadeInUp}
              custom={2}
              className="text-xs md:text-sm text-[#454843] font-light"
            >
              Scientifically proven botanicals tested across environmental gradients for lasting barrier vitality.
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-40px" }}
            variants={staggerContainer}
            className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12"
          >
            {VALIDATED_FORMULATIONS.map((prod, index) => (
              <motion.div
                key={prod.id}
                variants={fadeInUp}
                custom={index}
                className="group cursor-pointer text-center"
                onClick={() => navigate('/shop')}
              >
                <div className="aspect-square bg-[#fff8f5] mb-6 overflow-hidden relative shadow-sm border border-[#c5c7c1]/20">
                  <img
                    src={prod.image || 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&q=80&w=400'}
                    alt={prod.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute bottom-0 left-0 w-full p-3.5 bg-[#5b6056]/90 text-white text-center text-xs font-semibold uppercase tracking-widest opacity-0 group-hover:opacity-100 transform translate-y-3 group-hover:translate-y-0 transition-all duration-300 flex items-center justify-center gap-2">
                    {addedItem === prod.id ? (
                      <>
                        <Check size={14} className="text-emerald-300" />
                        <span>Added to Bag</span>
                      </>
                    ) : (
                      <span onClick={(e) => handleQuickAdd(prod, e)}>Shop Now</span>
                    )}
                  </div>
                </div>
                <h3 className="font-serif-luxury text-2xl text-[#1e1b18] mb-1 group-hover:text-[#5b6056] transition-colors">
                  {prod.name}
                </h3>
                <p className="text-xs font-semibold uppercase tracking-widest text-[#5e5f5c]">
                  ${prod.priceUSD.toFixed(2)} <span className="text-[11px] text-[#454843]/60 font-normal">/ ৳ {prod.priceBDT.toLocaleString()}</span>
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* 6. THE HUMAN CONNECTION: Built on Enduring Partnerships */}
      <section className="py-20 lg:py-32 bg-[#f5ece7] overflow-hidden">
        <div className="max-w-[1440px] mx-auto px-6 md:px-12 lg:px-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            {/* Left Framed Partnership Photo */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              variants={fadeIn}
              className="lg:col-span-6 order-2 lg:order-1"
            >
              <div className="glass-card p-4 shadow-xl border border-white/60">
                <img
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuDgTQaRbZixVhXln6so0dlGREA6GdOxL6yXvgemYepAqppVLtsFcT0lRhGmgb8mpDma_IiHb7ErIK9YUuAZXa8U9kNLaekLj18qSdqCKTaCfeAVxfPF-05iV1Nu3l90UqgsNet-NpGGNXu5KPSvsedYRNoJRT9k5Stmh0y2DcctzfMcWIo9blVPY-pwRvwpbXnAWL3OLX1kyUSTF6AdswBgZ8Dmczc8DTQh0mhesKKKhqlRUpNG8Vz86KG0i9btEXetVjx8yVx1mUo"
                  alt="Strategic Partnership between Korea & Bangladesh"
                  className="w-full h-auto object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
            </motion.div>

            {/* Right Narrative */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              variants={staggerContainer}
              className="lg:col-span-6 order-1 lg:order-2 space-y-6"
            >
              <motion.div variants={fadeInUp}>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5e5f5c] mb-3">
                  The Human Connection
                </p>
                <h2 className="font-serif-luxury text-3xl sm:text-4xl md:text-5xl font-normal text-[#1e1b18] leading-tight">
                  Built on Enduring Partnerships
                </h2>
              </motion.div>

              <motion.div
                variants={fadeInUp}
                custom={1}
                className="relative pl-8 md:pl-12 border-l-2 border-[#5e5f5c]/30 py-2"
              >
                <p className="font-serif-luxury italic text-lg md:text-xl text-[#454843] leading-relaxed">
                  &ldquo;KOREAN SKIN FOOD is more than a beauty brand; it&apos;s a bridge between cultures. Our commitment to authentic sourcing and transparent operations is what defines our legacy in the global market.&rdquo;
                </p>
                <div className="mt-6 text-xs font-bold uppercase tracking-[0.2em] text-[#1e1b18] not-italic">
                  — STRATEGIC LEADERSHIP TEAM
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 7. CURATED COLLABORATIONS: The Partnership Selection */}
      <section className="py-20 lg:py-28 bg-[#fff8f5]">
        <div className="max-w-[1440px] mx-auto px-6 md:px-12 lg:px-20">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-40px" }}
            variants={fadeInUp}
            className="mb-12"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5e5f5c] mb-2">
              Curated Collaborations
            </p>
            <h2 className="font-serif-luxury text-3xl md:text-4xl font-normal text-[#1e1b18]">
              The Partnership Selection
            </h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-40px" }}
            variants={staggerContainer}
            className="grid grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8"
          >
            {PARTNERSHIP_SELECTION.map((prod, index) => (
              <motion.div
                key={prod.id}
                variants={fadeInUp}
                custom={index}
                className="group cursor-pointer"
                onClick={() => navigate('/shop')}
              >
                <div className="aspect-[4/5] bg-[#efe6e2] mb-4 overflow-hidden relative border border-[#c5c7c1]/30">
                  <img
                    src={prod.image || 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&q=80&w=400'}
                    alt={prod.name}
                    className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute bottom-3 left-3 right-3 p-2.5 bg-[#fff8f5]/95 border border-[#757873] text-[#1e1b18] text-center text-[11px] font-semibold uppercase tracking-widest opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                    {addedItem === prod.id ? 'Added!' : 'Shop Now'}
                  </div>
                </div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#1e1b18] mb-1 truncate">
                  {prod.name}
                </h3>
                <p className="text-xs text-[#5e5f5c] font-medium">
                  ${prod.priceUSD.toFixed(2)} <span className="text-[10px] text-[#454843]/60">/ ৳ {prod.priceBDT.toLocaleString()}</span>
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* 8. THE PEOPLE BEHIND THE LIGHT: A Shared Journey of Radiance */}
      <section className="py-20 lg:py-28 bg-[#fff8f5] border-t border-[#c5c7c1]/20">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-40px" }}
          variants={staggerContainer}
          className="max-w-[1440px] mx-auto px-6 md:px-12 lg:px-20 mb-14 text-center space-y-3"
        >
          <motion.p
            variants={fadeInUp}
            className="text-xs font-semibold uppercase tracking-[0.25em] text-[#5e5f5c]"
          >
            The People Behind the Light
          </motion.p>
          <motion.h2
            variants={fadeInUp}
            custom={1}
            className="font-serif-luxury text-3xl sm:text-4xl md:text-5xl font-normal text-[#1e1b18]"
          >
            A Shared Journey of Radiance
          </motion.h2>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-40px" }}
          variants={staggerContainer}
          className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 max-w-[1600px] mx-auto px-4"
        >
          <motion.div variants={fadeInUp} custom={0} className="aspect-square overflow-hidden group relative bg-black">
            <img
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuD6vSS8IAHvxnL_OZ3sEB7rTece_ypiqy2nRqWiqV-Rw8V-fYFH4c-ByE7fQ9KD5Nhw_0jAJfYWD_CSMaoEu22IIKLRKVdf0_CfP_9sEbKJGYEyd5BfAsbMnHgj8kzbStrV7p3mgKhNEQ_WArQV5ud1YEqdj7GioWGS3JoUo-Py4ubbB5YXNKGC5GYFEXBuxc52KRyK13TM083bsn1UXb_WRr5Frdwr3Ya4XYaGwoTaSmUsuTBYk7fMWLU-l8EgMJu6sCVMdfGotNI"
              alt="Team Radiance Moment 1"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-95 group-hover:opacity-100"
              referrerPolicy="no-referrer"
            />
          </motion.div>

          <motion.div variants={fadeInUp} custom={1} className="aspect-square overflow-hidden group relative bg-black">
            <img
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDmn3wly8UL5fVifoYvSQUmPLv2SdMjpqgJ_mhO5gAjK14IcNcKDAO-YfKLi-lCKZ8Afo6mhLQa69Jzb60PR6TT4BdBC_K5b4VC2uKlahiFIGCwkj5YESsxgz3PAfnCis1vWPqwagFwXH1aKFv3WCtUSFBpd0TYyeSw8PDMM6tJdtyEDT2LcmggftIygChvbDGpR98mArQKFT--Zo9CgurQHiVxdqlDn8hqepgA3KSH3anTPDI0HWEhqXV_HjT7nB6xIjFVllK45VQ"
              alt="Team Radiance Moment 2"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-95 group-hover:opacity-100"
              referrerPolicy="no-referrer"
            />
          </motion.div>

          <motion.div variants={fadeInUp} custom={2} className="aspect-square overflow-hidden group relative bg-black">
            <img
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCsU_XTcOydrioCuy6mHIZedJtGV3TCRDrVSlwVPpsfYOfQloKy1qznJZTKH3Xq6R-ugsETs8yKfKmPyOgAtCPMwWmDzeGGbEGQp9sQ6xmKKDH8qTWq8omZth-pATb0Bil74mpy055B_LoLYxLZLzTduYUi-fRwwOsCuDTVmmnn2meqqsZ4noBissSJB9AJlGbe_0a6Fo-OCmmXIEadhOXzO9gy2SEZvowvnKOoqO6hr4uC4kA7MNUwzFHqGHa6o1OUi3JLlgCnFiY"
              alt="Team Radiance Moment 3"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-90 group-hover:opacity-100"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-[#1e1b18]/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-4">
              <p className="text-white text-xs font-semibold tracking-widest uppercase">Our Core Team</p>
            </div>
          </motion.div>

          <motion.div variants={fadeInUp} custom={3} className="aspect-square overflow-hidden group relative bg-black">
            <img
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCVySvNsYG6RFEynasCzuPyDD8rusS84mfYyPW56DnvMJsK--qRK4mgCs1Ngdw8h0YhR_Da7rZtXEx-bap68883mcCWSb4KozrXbopvo4T3FZMmqEE4LGjxyY6shubMeXYRhMdShwfUUQ1RGld2ONlirKF8Sgp7bjO2pY70JCGASzerVSsFq-9Ve2DkraqsQZh7nG9JGsRrnwr-DPjT9d51pTJC2Bz2RHggqsfL7gPQryBAqHgI94-dsSexnpOnYTQPTo9dPPSZdpY"
              alt="Team Radiance Moment 4"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-95 group-hover:opacity-100"
              referrerPolicy="no-referrer"
            />
          </motion.div>
        </motion.div>
      </section>

      {/* 9. REACH & RELIABILITY: Bridging Continents */}
      <section className="py-20 lg:py-32 bg-[#fbf2ed]">
        <div className="max-w-[1440px] mx-auto px-6 md:px-12 lg:px-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              variants={staggerContainer}
              className="lg:col-span-5 space-y-8"
            >
              <motion.div variants={fadeInUp}>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5e5f5c] mb-3">
                  Reach &amp; Reliability
                </p>
                <h2 className="font-serif-luxury text-3xl sm:text-4xl md:text-5xl font-normal text-[#1e1b18] leading-tight">
                  Bridging Continents
                </h2>
              </motion.div>
              <motion.p
                variants={fadeInUp}
                custom={1}
                className="text-sm md:text-base text-[#454843] font-light leading-relaxed"
              >
                From our meticulous operations hubs in South Korea to our specialized regional offices, we ensure every product arrives with its botanical potency fully preserved. We operate with a transparency that is as clear as the light we promote.
              </motion.p>

              <motion.div
                variants={fadeInUp}
                custom={2}
                className="grid grid-cols-2 gap-4 pt-2"
              >
                <div className="border border-[#c5c7c1] bg-[#fff8f5]/80 p-5">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#1e1b18] mb-1">
                    Transit
                  </h4>
                  <p className="font-serif-luxury text-2xl text-[#5e5f5c] font-normal">Secure</p>
                  <p className="text-[11px] text-[#454843]/70">Direct Channels</p>
                </div>
                <div className="border border-[#c5c7c1] bg-[#fff8f5]/80 p-5">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#1e1b18] mb-1">
                    Integrity
                  </h4>
                  <p className="font-serif-luxury text-2xl text-[#5e5f5c] font-normal">100%</p>
                  <p className="text-[11px] text-[#454843]/70">Verified Origins</p>
                </div>
              </motion.div>
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              variants={fadeIn}
              className="lg:col-span-6 lg:col-start-7"
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-4">
                  <img
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuCgpqTQgZYXgKUkN6o1SsWplJBH8NvtdkkURiY9HqR2Dp5EzELgoBYJeirZB8yvJ-lzvKkPFLLXax2xGGO0XD_AeOqMkt3c6xp5i06Coe_7rWAfOHKSnL8Ou7YHVjqPicBnKcSPai1_9540Lo-bunSgSMODzzWoXsImvjKuGYRshM4Px7Z46MZx_56iNMm8Ge96CTluUtHdm28rog9DZOtedYJp43WZuvFVeB1y6119UVdU2-E9ymYgKCAm8TMAkAYvy7bpGYoT46I"
                    alt="Operations Hub in Seoul"
                    className="w-full h-56 md:h-64 object-cover shadow-md"
                    referrerPolicy="no-referrer"
                  />
                  <img
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuCDoVlcveeL6BbwjoPCSbobXaTJNM7TReLGuvKIDqAww26XR9QQRoxioriDwqJX-rz_iYd6RzLU9fpSkmouWRdPs-RxzDBx9KXq6Gw9RaJClhEdfrjxUnbLcn4Leh86-VBAoMo0HU-cXhstTVHf6u9upQQp-6oLgFYn3DBG5gIM__U_j5Tpv4Ro9OlsdMQal2xN_G9_nR1CxbvMd3ImUogiiXR2czFJYcmFDC5DOVa81SzcVALZk7Ow2iCzsJsc_M3UNRjEUNYhZhA"
                    alt="Distribution Cargo Center"
                    className="w-full h-64 md:h-80 object-cover shadow-md"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="pt-8 md:pt-12">
                  <img
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuCVySvNsYG6RFEynasCzuPyDD8rusS84mfYyPW56DnvMJsK--qRK4mgCs1Ngdw8h0YhR_Da7rZtXEx-bap68883mcCWSb4KozrXbopvo4T3FZMmqEE4LGjxyY6shubMeXYRhMdShwfUUQ1RGld2ONlirKF8Sgp7bjO2pY70JCGASzerVSsFq-9Ve2DkraqsQZh7nG9JGsRrnwr-DPjT9d51pTJC2Bz2RHggqsfL7gPQryBAqHgI94-dsSexnpOnYTQPTo9dPPSZdpY"
                    alt="Strategic Leadership Delegation"
                    className="w-full h-full object-cover shadow-md"
                    referrerPolicy="no-referrer"
                  />
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 10. GLOBAL REACH: Bestselling Rituals */}
      <section className="py-20 lg:py-28 bg-[#f5ece7]">
        <div className="max-w-[1440px] mx-auto px-6 md:px-12 lg:px-20">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-40px" }}
            variants={staggerContainer}
            className="flex flex-col items-center text-center mb-16 space-y-3"
          >
            <motion.p
              variants={fadeInUp}
              className="text-xs font-semibold uppercase tracking-[0.25em] text-[#5e5f5c]"
            >
              Global Reach
            </motion.p>
            <motion.h2
              variants={fadeInUp}
              custom={1}
              className="font-serif-luxury text-3xl sm:text-4xl md:text-5xl font-normal text-[#1e1b18]"
            >
              Bestselling Rituals
            </motion.h2>
            <motion.p
              variants={fadeInUp}
              custom={2}
              className="text-xs md:text-sm text-[#454843] font-light max-w-md"
            >
              Beloved by skincare devotees across Seoul, Dhaka, and beyond.
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-40px" }}
            variants={staggerContainer}
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
          >
            {BESTSELLING_RITUALS.map((prod, index) => (
              <motion.div
                key={prod.id}
                variants={fadeInUp}
                custom={index}
                className="group cursor-pointer"
                onClick={() => navigate('/shop')}
              >
                <div className="aspect-square bg-[#fff8f5] mb-6 overflow-hidden relative shadow-sm border border-[#c5c7c1]/20">
                  <img
                    src={prod.image || 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&q=80&w=400'}
                    alt={prod.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute bottom-0 left-0 w-full p-4 bg-[#1e1b18] text-[#fff8f5] text-center text-xs font-semibold uppercase tracking-widest opacity-0 group-hover:opacity-100 transform translate-y-3 group-hover:translate-y-0 transition-all duration-300 flex items-center justify-center gap-2">
                    {addedItem === prod.id ? (
                      <>
                        <Check size={14} className="text-emerald-400" />
                        <span>Added to Bag</span>
                      </>
                    ) : (
                      <span onClick={(e) => handleQuickAdd(prod, e)}>Shop Ritual</span>
                    )}
                  </div>
                </div>
                <h3 className="font-serif-luxury text-2xl text-[#1e1b18] text-center mb-1 group-hover:text-[#5b6056] transition-colors">
                  {prod.name}
                </h3>
                <p className="text-xs font-semibold uppercase tracking-widest text-[#5e5f5c] text-center">
                  ${prod.priceUSD.toFixed(2)} <span className="text-[11px] text-[#454843]/60 font-normal">/ ৳ {prod.priceBDT.toLocaleString()}</span>
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* 11. LUXURY CONSULTATION BANNER */}
      <section className="py-16 bg-[#1e1b18] text-[#fff8f5] px-6 md:px-12 lg:px-20">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-40px" }}
          variants={staggerContainer}
          className="max-w-[1440px] mx-auto flex flex-col lg:flex-row items-center justify-between gap-8 text-center lg:text-left"
        >
          <motion.div variants={fadeInUp} className="space-y-2 max-w-xl">
            <p className="text-xs uppercase tracking-[0.25em] text-[#c5c7c1]">Direct Guidance</p>
            <h3 className="font-serif-luxury text-2xl md:text-3xl font-normal">
              Begin Your Custom Skincare Ritual
            </h3>
            <p className="text-xs md:text-sm text-[#c5c7c1]/80 font-light">
              Connect directly with our Seoul-trained specialists to tailor formulas formulated for your climate and barrier profile.
            </p>
          </motion.div>
          <motion.div variants={fadeInUp} custom={1} className="flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={() => navigate('/contact-us')}
              className="border border-[#c5c7c1] text-white hover:bg-white hover:text-[#1e1b18] px-8 py-3.5 text-xs font-semibold uppercase tracking-widest transition-colors duration-300 rounded-none cursor-pointer"
            >
              Consult an Expert
            </button>
            <button
              onClick={() => navigate('/shop')}
              className="bg-[#5b6056] text-white hover:bg-[#44483f] px-8 py-3.5 text-xs font-semibold uppercase tracking-widest transition-colors duration-300 rounded-none cursor-pointer"
            >
              Explore Full Collection
            </button>
          </motion.div>
        </motion.div>
      </section>
    </motion.div>
  );
};


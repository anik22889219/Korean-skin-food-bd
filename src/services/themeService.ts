import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, sanitizeForFirestore } from './firebase';
import {
  HomeThemeSettings,
  GlobalThemeSettings,
  ShopThemeSettings,
  PagesThemeSettings,
  PageThemeKey,
  FooterColumnsSettings,
  ReelItem
} from '../types/theme';
import { queryClient } from '../lib/queryClient';
import { queryKeys } from '../lib/queryKeys';

export const DEFAULT_SHOP_THEME: ShopThemeSettings = {
  heroTitle: 'The Apothecary',
  heroSubtitle: 'Discover carefully curated Korean skincare essentials for every ritual, skin type, and concern.',
  heroBannerUrl: 'https://images.unsplash.com/photo-1616683693504-3ea7e9ad6fec?w=1600&auto=format&fit=crop&q=80',
  quoteText: '"Skin is the mirror of your soul\'s health. Treat it with the reverence of a ritual."',
  quoteAuthor: 'Korean Skin Food Wisdom',
  itemsPerPage: 12,
  defaultSort: 'featured'
};

export const DEFAULT_FOOTER_COLUMNS: FooterColumnsSettings = {
  store: {
    title: 'Explore Store',
    links: [
      { id: 'st-home', label: 'Home Page', to: '/', enabled: true },
      { id: 'st-shop', label: 'Shop All Skincare', to: '/shop', enabled: true },
      { id: 'st-brands', label: 'Korean Brands Directory', to: '/brands', enabled: true },
      { id: 'st-concerns', label: 'Shop by Skin Concern', to: '/concerns', enabled: true },
      { id: 'st-ingredients', label: 'Ingredient Library', to: '/ingredients', enabled: true },
      { id: 'st-quiz', label: 'Skin Profile Quiz', to: '/skin-quiz', enabled: true },
      { id: 'st-routine', label: 'AM/PM Routine Builder', to: '/routine-builder', enabled: true },
      { id: 'st-guides', label: 'Skincare Routine Guides', to: '/guides', enabled: true },
      { id: 'st-reviews', label: 'Google Business Reviews', to: 'https://share.google/lEQv5trQv88b0w8WT', enabled: true, isExternal: true, highlight: true },
    ]
  },
  partners: {
    title: 'Partners & Account',
    links: [
      { id: 'pt-apply', label: 'Become a Creator', to: '/become-a-creator', enabled: true },
      { id: 'pt-board', label: 'Creator Leaderboard', to: '/creator/leaderboard', enabled: true },
      { id: 'pt-wholesale', label: 'Wholesale Portal', to: '/wholesale', enabled: true },
      { id: 'pt-profile', label: 'My Account & Orders', to: '/profile', enabled: true },
      { id: 'pt-login', label: 'Sign In / Register', to: '/login', enabled: true },
    ]
  },
  legal: {
    title: 'Company & Legal',
    links: [
      { id: 'lg-authenticity', label: 'Authenticity & Inspection', to: '/authenticity', enabled: true, highlight: true },
      { id: 'lg-about', label: 'About Our Story', to: '/about-us', enabled: true },
      { id: 'lg-contact', label: 'Contact & Help Desk', to: '/contact-us', enabled: true },
      { id: 'lg-privacy', label: 'Privacy Policy', to: '/privacy-policy', enabled: true },
      { id: 'lg-terms', label: 'Terms of Service', to: '/terms-of-service', enabled: true },
    ]
  }
};

export const DEFAULT_GLOBAL_THEME: GlobalThemeSettings = {
  faviconUrl: '/icon.svg',
  logoUrl: '',
  logoText: 'Korean Skin Food BD',
  logoTagline: 'KOREAN SKINCARE BANGLADESH',
  primaryColor: '#E91E8C',
  secondaryColor: '#FF62B2',
  accentColor: '#0F172A',
  backgroundColor: '#FFF5F8',
  headingFont: 'Hind Siliguri',
  bodyFont: 'Open Sans',
  siteTitle: 'Korean Skin Food BD',
  siteTagline: 'Curated Korean skincare and daily beauty essentials with Cash on Delivery across Bangladesh.',
  contactPhone: '+880 1755-837545',
  contactEmail: 'koreanskinfood.bd@gmail.com',
  contactAddress: 'Banani Road 11, Dhaka, Bangladesh',
  currencySymbol: '৳',
  facebookUrl: 'https://www.facebook.com/Koreanskinfood',
  instagramUrl: 'https://www.instagram.com/korean_skin_food_2579/',
  youtubeUrl: 'https://youtube.com',
  messengerUrl: 'https://m.me/651561268050601',
  announcementText: 'FREE delivery inside & across Bangladesh for orders over ৳2,000!',
  enableAnnouncement: true,
  footerText: 'Korean Skin Food BD © 2026. All rights reserved. Korean Skincare Bangladesh.',
  footerColumns: DEFAULT_FOOTER_COLUMNS,
};

export const DEFAULT_HOME_THEME: HomeThemeSettings = {
  sectionOrder: [
    'hero',
    'featureIcons',
    'founderStory',
    'botanicalEssentials',
    'qualityAssurance',
    'googleReviews',
    'sharedJourney',
    'reachReliability',
    'communityLive'
  ],
  hero: {
    enabled: true,
    badgeText: 'Korean Skincare Store Bangladesh',
    titleLine1: 'Korean Skincare',
    titleHighlight: 'Curated for',
    titleLine2: 'Bangladesh',
    subtitle: 'Shop cleansers, toners, serums, moisturizers, and sunscreens from popular Korean beauty brands with clear product guidance and Cash on Delivery across Bangladesh.',
    primaryButtonText: 'Shop Skincare',
    primaryButtonLink: '/shop',
    secondaryButtonText: 'Skin Profile Quiz',
    secondaryButtonLink: '/skin-quiz',
    backgroundImageUrl: '/og-banner.jpg',
    showShippingCalculator: true,
    calculatorTitle: 'Delivery Coverage',
    shipFrom: 'Dhaka Hub',
    shipTo: 'All 64 Districts',
    cargoName: 'CASH ON DELIVERY',
    cargoBadge: 'Nationwide',
    weightLabel: 'Weight (kg)',
    weightPlaceholder: 'Enter weight',
    calculateButtonText: 'Browse Catalog',
    rateNote: 'Inside Dhaka ৳80 • Outside Dhaka ৳150 • Free over ৳2,000'
  },
  featureIcons: {
    enabled: true,
    items: [
      {
        id: 'feat-1',
        enabled: true,
        iconName: 'language',
        title: 'Korean Skincare Brands',
        bgColor: 'bg-pink-50',
        iconColor: 'text-pink-500'
      },
      {
        id: 'feat-2',
        enabled: true,
        iconName: 'storefront',
        title: 'Bilingual Product Guides',
        bgColor: 'bg-purple-50',
        iconColor: 'text-purple-600'
      },
      {
        id: 'feat-3',
        enabled: true,
        iconName: 'speed',
        title: 'COD Nationwide Delivery',
        bgColor: 'bg-blue-50',
        iconColor: 'text-blue-400'
      },
      {
        id: 'feat-4',
        enabled: true,
        iconName: 'verified',
        title: 'Seal & Batch Inspection',
        bgColor: 'bg-green-50',
        iconColor: 'text-green-500'
      },
      {
        id: 'feat-5',
        enabled: true,
        iconName: 'request_quote',
        title: 'Routine Guidance Support',
        bgColor: 'bg-orange-50',
        iconColor: 'text-orange-500'
      }
    ]
  },
  founderStory: {
    enabled: true,
    subtitle: "OUR STORY",
    title: 'Everyday Korean Skincare Care',
    quote: '"Our focus is helping shoppers across Bangladesh choose transparent, well-formulated Korean skincare suited to their daily climate and skin needs."',
    body: 'Korean Skin Food BD curates daily cleansers, soothing toners, serums, moisturizers, and UV protection with bilingual usage guidance and Cash on Delivery nationwide.',
    estYear: 'Dhaka, BD',
    founderImageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBOzj3L4E3LOsKUDd0DevhbePBhoN3Ar8wYAQm_f5w6DkiNR5L2FUJvU6W-27PQtA2rOxk-v1sV4q3HMHdQGm-j3ilMcval8tFJTyxwscNNsucABHWJbNLEzSdKS2ILYoBSJlaVLJN2SbyIQVdX1bhfh3woUNckwmO8_j8Vn8NdShxGN28-fwVhO2Kko2WnVffR4ROmOGKrLWwk6e-AFvApBzdGE2fX_bcr_xzL7eB6MfDEIHP-LPaeIGxPa89Hq4dqPpC0B7S95Mw',
    councilLabel: 'KOREAN SKIN FOOD BD'
  },
  botanicalEssentials: {
    enabled: true,
    subtitle: 'CURATED FAVORITES',
    title: 'Daily Skincare Essentials',
    buttonText: 'Add to Bag',
    selectedProductIds: []
  },
  qualityAssurance: {
    enabled: true,
    subtitle: 'CAREFUL HANDLING',
    title: 'Batch, Seal & Expiry Checks',
    description: 'Every product in our catalog is checked for sealed packaging, legible expiration dates, and protective parcel packing before dispatch in Bangladesh.',
    features: [
      {
        id: 'qa-1',
        numberStr: '01',
        title: 'EXPIRY & SEAL CHECK',
        desc: 'Items are inspected for intact outer packaging and clear batch/expiry printing before dispatch.'
      },
      {
        id: 'qa-2',
        numberStr: '02',
        title: '48-HOUR INSPECTION SUPPORT',
        desc: 'If a parcel arrives damaged or incorrect, report it within 48 hours with photos or unboxing video.'
      }
    ],
    mainImageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDH2LoWWo-SbNTwCqrFgUFpyUtVIC9bOI4Zrj135WguZql4fmOPsK8prr_BbxhLktvvOYy1p5wcEO-eTQ9gubPk5aAVaAjigFYYRbHd3YWd6mJcuyDCq8xe5nPFfIV8ss6_O9l7aGuEyE31MHKopI2hkkbjfu_ZryYj0sTdLmwoWVkbRkUEdUQue37h2ArOZx_BhXszbrBVFJh_upJcr__mTcIGmbqDPZ8ulsEwInSslEAURYbPnhcJzD3WRyfortj_I1smJazHTV8',
    opsNoteTitle: 'Handling Note',
    opsNoteQuote: '"Clear expiry information, sealed parcels, and honest routine guidance come first."',
    opsNoteImageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCDoVlcveeL6BbwjoPCSbobXaTJNM7TReLGuvKIDqAww26XR9QQRoxioriDwqJX-rz_iYd6RzLU9fpSkmouWRdPs-RxzDBx9KXq6Gw9RaJClhEdfrjxUnbLcn4Leh86-VBAoMo0HU-cXhstTVHf6u9upQQp-6oLgFYn3DBG5gIM__U_j5Tpv4Ro9OlsdMQal2xN_G9_nR1CxbvMd3ImUogiiXR2czFJYcmFDC5DOVa81SzcVALZk7Ow2iCzsJsc_M3UNRjEUNYhZhA'
  },
  validatedFormulations: {
    enabled: false,
    subtitle: 'SKINCARE EDUCATION',
    title: 'Targeted Formulations',
    buttonText: 'Shop Now',
    selectedProductIds: []
  },
  sharedJourney: {
    enabled: true,
    subtitle: 'COMMUNITY HIGHLIGHTS',
    title: 'Daily Skincare Rituals',
    photos: [
      {
        id: 'p-1',
        imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD6vSS8IAHvxnL_OZ3sEB7rTece_ypiqy2nRqWiqV-Rw8V-fYFH4c-ByE7fQ9KD5Nhw_0jAJfYWD_CSMaoEu22IIKLRKVdf0_CfP_9sEbKJGYEyd5BfAsbMnHgj8kzbStrV7p3mgKhNEQ_WArQV5ud1YEqdj7GioWGS3JoUo-Py4ubbB5YXNKGC5GYFEXBuxc52KRyK13TM083bsn1UXb_WRr5Frdwr3Ya4XYaGwoTaSmUsuTBYk7fMWLU-l8EgMJu6sCVMdfGotNI',
        altText: 'Team Moment 1'
      },
      {
        id: 'p-2',
        imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDmn3wly8UL5fVifoYvSQUmPLv2SdMjpqgJ_mhO5gAjK14IcNcKDAO-YfKLi-lCKZ8Afo6mhLQa69Jzb60PR6TT4BdBC_K5b4VC2uKlahiFIGCwkj5YESsxgz3PAfnCis1vWPqwagFwXH1aKFv3WCtUSFBpd0TYyeSw8PDMM6tJdtyEDT2LcmggftIygChvbDGpR98mArQKFT--Zo9CgurQHiVxdqlDn8hqepgA3KSH3anTPDI0HWEhqXV_HjT7nB6xIjFVllK45VQ',
        altText: 'Team Moment 2'
      },
      {
        id: 'p-3',
        imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCsU_XTcOydrioCuy6mHIZedJtGV3TCRDrVSlwVPpsfYOfQloKy1qznJZTKH3Xq6R-ugsETs8yKfKmPyOgAtCPMwWmDzeGGbEGQp9sQ6xmKKDH8qTWq8omZth-pATb0Bil74mpy055B_LoLYxLZLzTduYUi-fRwwOsCuDTVmmnn2meqqsZ4noBissSJB9AJlGbe_0a6Fo-OCmmXIEadhOXzO9gy2SEZvowvnKOoqO6hr4uC4kA7MNUwzFHqGHa6o1OUi3JLlgCnFiY',
        altText: 'Team Moment 3',
        hoverText: 'Our Team'
      },
      {
        id: 'p-4',
        imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCVySvNsYG6RFEynasCzuPyDD8rusS84mfYyPW56DnvMJsK--qRK4mgCs1Ngdw8h0YhR_Da7rZtXEx-bap68883mcCWSb4KozrXbopvo4T3FZMmqEE4LGjxyY6shubMeXYRhMdShwfUUQ1RGld2ONlirKF8Sgp7bjO2pY70JCGASzerVSsFq-9Ve2DkraqsQZh7nG9JGsRrnwr-DPjT9d51pTJC2Bz2RHggqsfL7gPQryBAqHgI94-dsSexnpOnYTQPTo9dPPSZdpY',
        altText: 'Team Moment 4'
      }
    ]
  },
  reachReliability: {
    enabled: true,
    subtitle: 'DELIVERY & TRANSPARENCY',
    title: 'Nationwide Bangladesh Coverage',
    description: 'From Dhaka City deliveries in 24–48 hours to courier dispatch across all 64 districts, we pack orders carefully with transparent Cash on Delivery rates.',
    stats: [
      {
        id: 'stat-1',
        label: 'COVERAGE',
        value: '64 Districts',
        subValue: 'Cash on Delivery'
      },
      {
        id: 'stat-2',
        label: 'FREE DELIVERY',
        value: '৳2,000+',
        subValue: 'Orders Eligible'
      }
    ],
    image1Url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCgpqTQgZYXgKUkN6o1SsWplJBH8NvtdkkURiY9HqR2Dp5EzELgoBYJeirZB8yvJ-lzvKkPFLLXax2xGGO0XD_AeOqMkt3c6xp5i06Coe_7rWAfOHKSnL8Ou7YHVjqPicBnKcSPai1_9540Lo-bunSgSMODzzWoXsImvjKuGYRshM4Px7Z46MZx_56iNMm8Ge96CTluUtHdm28rog9DZOtedYJp43WZuvFVeB1y6119UVdU2-E9ymYgKCAm8TMAkAYvy7bpGYoT46I',
    image2Url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDH2LoWWo-SbNTwCqrFgUFpyUtVIC9bOI4Zrj135WguZql4fmOPsK8prr_BbxhLktvvOYy1p5wcEO-eTQ9gubPk5aAVaAjigFYYRbHd3YWd6mJcuyDCq8xe5nPFfIV8ss6_O9l7aGuEyE31MHKopI2hkkbjfu_ZryYj0sTdLmwoWVkbRkUEdUQue37h2ArOZx_BhXszbrBVFJh_upJcr__mTcIGmbqDPZ8ulsEwInSslEAURYbPnhcJzD3WRyfortj_I1smJazHTV8',
    image3Url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCVySvNsYG6RFEynasCzuPyDD8rusS84mfYyPW56DnvMJsK--qRK4mgCs1Ngdw8h0YhR_Da7rZtXEx-bap68883mcCWSb4KozrXbopvo4T3FZMmqEE4LGjxyY6shubMeXYRhMdShwfUUQ1RGld2ONlirKF8Sgp7bjO2pY70JCGASzerVSsFq-9Ve2DkraqsQZh7nG9JGsRrnwr-DPjT9d51pTJC2Bz2RHggqsfL7gPQryBAqHgI94-dsSexnpOnYTQPTo9dPPSZdpY'
  },
  communityLive: {
    enabled: true,
    subtitle: 'SOCIAL RHYTHM',
    title: 'Community Live',
    reelsSectionTitle: 'Facebook Reels',
    viewAllLinkText: 'View All Moments',
    viewAllLinkUrl: '#',
    reels: [
      {
        id: 'reel-1',
        title: 'Korean Skincare Routine & Glow Secrets',
        coverUrl: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600&auto=format&fit=crop&q=60',
        videoUrl: 'https://res.cloudinary.com/demo/video/upload/q_auto,f_auto/v1611158652/samples/cld-sample-video.mp4',
        postUrl: 'https://www.facebook.com/share/r/1Epn8LCGMT/',
        createdAt: '2026-07-20',
        viewsCount: 3450,
        likesCount: 580,
        sharesCount: 94
      },
      {
        id: 'reel-2',
        title: 'Glass Skin Glow & Authentic K-Beauty Unboxing',
        coverUrl: 'https://images.unsplash.com/photo-1616683693504-3ea7e9ad6fec?w=600&auto=format&fit=crop&q=60',
        videoUrl: 'https://vjs.zencdn.net/v/oceans.mp4',
        postUrl: 'https://www.facebook.com/share/r/1DHQbuWo9Y/',
        createdAt: '2026-07-15',
        viewsCount: 5120,
        likesCount: 790,
        sharesCount: 142
      },
      {
        id: 'reel-3',
        title: 'Daily Hydration & Botanical Care Highlights',
        coverUrl: 'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=600&auto=format&fit=crop&q=60',
        videoUrl: 'https://res.cloudinary.com/demo/video/upload/samples/sea-turtle.mp4',
        postUrl: 'https://www.facebook.com/share/r/18oiK3D2Vd/',
        createdAt: '2026-07-08',
        viewsCount: 2890,
        likesCount: 340,
        sharesCount: 58
      },
      {
        id: 'reel-4',
        title: 'Pure Centella & Calming Facial Ritual',
        coverUrl: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&auto=format&fit=crop&q=60',
        videoUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
        postUrl: 'https://www.facebook.com/share/r/1Epn8LCGMT/',
        createdAt: '2026-07-02',
        viewsCount: 4210,
        likesCount: 630,
        sharesCount: 110
      },
      {
        id: 'reel-5',
        title: 'Seoul Direct Cargo & Luxury Packaging Quality',
        coverUrl: 'https://images.unsplash.com/photo-1512290900672-1f487e4157eb?w=600&auto=format&fit=crop&q=60',
        videoUrl: 'https://res.cloudinary.com/demo/video/upload/elephants.mp4',
        postUrl: 'https://www.facebook.com/share/r/1DHQbuWo9Y/',
        createdAt: '2026-06-28',
        viewsCount: 3190,
        likesCount: 480,
        sharesCount: 82
      },
      {
        id: 'reel-6',
        title: 'Customer Favorites: Barrier Repair & Moisture Boost',
        coverUrl: 'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=600&auto=format&fit=crop&q=60',
        videoUrl: 'https://res.cloudinary.com/demo/video/upload/dog.mp4',
        postUrl: 'https://www.facebook.com/share/r/18oiK3D2Vd/',
        createdAt: '2026-06-22',
        viewsCount: 4950,
        likesCount: 710,
        sharesCount: 135
      }
    ]
  },
  googleReviews: {
    enabled: true,
    subtitle: 'VERIFIED CUSTOMER LOVE',
    title: 'Google Business Reviews & Ratings',
    shareUrl: 'https://share.google/lEQv5trQv88b0w8WT',
    writeReviewUrl: 'https://g.page/r/CaiTn1_7AA34EAE/review',
    showBreakdown: true,
    maxReviews: 8
  }
};

export const DEFAULT_PAGES_THEME: PagesThemeSettings = {
  about: {
    showHero: true,
    heroBadge: 'Korean Skin Food BD',
    heroTitleLine1: 'Korean Skincare.',
    heroTitleHighlight: 'Transparent Care.',
    heroSubtitle: 'Helping customers across Bangladesh build thoughtful daily skincare routines with clear product information, batch/expiry checks, and Cash on Delivery nationwide.',
    heroPrimaryBtnText: 'Read Our Approach',
    heroSecondaryBtnText: 'Explore Catalog',
    heroSecondaryBtnLink: '/shop',
    heroImageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDygV0BUx3FRHwpnDvTSsMsiG1TsjcGBgKWE8vEsaUi5TRYTM-pzc4wgYwMs1-n-Zhv04YeC1al6FBGnOFf_6_JQacp8mUx8Ulk8cq0QFnA00nmiBUQLfC9i-UHYH8n1G4DJHoiA_X068q3nfC_i0QcK_uvJUfOM9DwxqtR7yczoZ1zTqwlvm5NeEUFPH0wHNqWT_LD9F3Xhgc2VREFAublAEJzOmy0z83LwvQ2vyOXHKxK4YZ77Q_Me3PJ_GIUl8BRSicxciMdpqM',
    showFoundersStory: true,
    foundersSubtitle: "Our Story",
    foundersTitle: 'Skincare Built Around Clarity',
    foundersQuote: '"Every routine starts with understanding your skin barrier, reading ingredient labels honestly, and avoiding unnecessary guesswork."',
    foundersBody: 'Korean Skin Food BD focuses on making daily Korean skincare approachable across Bangladesh—pairing bilingual usage tips and skin-concern education with sealed-parcel delivery.',
    foundersEstYear: 'Dhaka, BD',
    foundersCouncilLabel: 'Korean Skin Food BD',
    foundersImageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBOzj3L4E3LOsKUDd0DevhbePBhoN3Ar8wYAQm_f5w6DkiNR5L2FUJvU6W-27PQtA2rOxk-v1sV4q3HMHdQGm-j3ilMcval8tFJTyxwscNNsucABHWJbNLEzSdKS2ILYoBSJlaVLJN2SbyIQVdX1bhfh3woUNckwmO8_j8Vn8NdShxGN28-fwVhO2Kko2WnVffR4ROmOGKrLWwk6e-AFvApBzdGE2fX_bcr_xzL7eB6MfDEIHP-LPaeIGxPa89Hq4dqPpC0B7S95Mw',
    showHeritageEssentials: true,
    heritageSubtitle: 'Catalog Highlights',
    heritageTitle: 'Daily Skincare Essentials',
    showQualityAssurance: true,
    qaSubtitle: 'Packing & Handling',
    qaTitle: 'Careful Storage & Dispatch',
    qaDescription: 'Orders are checked for intact outer seals, legible batch/expiry markings, and protective packaging before handing off to courier partners.',
    qaMainImageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDH2LoWWo-SbNTwCqrFgUFpyUtVIC9bOI4Zrj135WguZql4fmOPsK8prr_BbxhLktvvOYy1p5wcEO-eTQ9gubPk5aAVaAjigFYYRbHd3YWd6mJcuyDCq8xe5nPFfIV8ss6_O9l7aGuEyE31MHKopI2hkkbjfu_ZryYj0sTdLmwoWVkbRkUEdUQue37h2ArOZx_BhXszbrBVFJh_upJcr__mTcIGmbqDPZ8ulsEwInSslEAURYbPnhcJzD3WRyfortj_I1smJazHTV8',
    qaNoteTitle: 'Dispatch Note',
    qaNoteQuote: '"We pack every parcel to arrive clean, sealed, and ready for your daily routine."',
    qaNoteImageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCDoVlcveeL6BbwjoPCSbobXaTJNM7TReLGuvKIDqAww26XR9QQRoxioriDwqJX-rz_iYd6RzLU9fpSkmouWRdPs-RxzDBx9KXq6Gw9RaJClhEdfrjxUnbLcn4Leh86-VBAoMo0HU-cXhstTVHf6u9upQQp-6oLgFYn3DBG5gIM__U_j5Tpv4Ro9OlsdMQal2xN_G9_nR1CxbvMd3ImUogiiXR2czFJYcmFDC5DOVa81SzcVALZk7Ow2iCzsJsc_M3UNRjEUNYhZhA',
    showValidatedScience: true,
    validatedSubtitle: 'Ingredient Focus',
    validatedTitle: 'Thoughtful Formulations',
    validatedDescription: 'Explore gentle cleansers, soothing humectants, and daily sun care chosen for Bangladesh weather.',
    showHumanConnection: true,
    humanSubtitle: 'Customer Care',
    humanTitle: 'Support That Listens',
    humanQuote: '"Whether you are choosing your first sunscreen or checking active-ingredient precautions, our support desk prioritizes clarity over hype."',
    humanAttribution: '— KOREAN SKIN FOOD BD TEAM',
    humanImageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDgTQaRbZixVhXln6so0dlGREA6GdOxL6yXvgemYepAqppVLtsFcT0lRhGmgb8mpDma_IiHb7ErIK9YUuAZXa8U9kNLaekLj18qSdqCKTaCfeAVxfPF-05iV1Nu3l90UqgsNet-NpGGNXu5KPSvsedYRNoJRT9k5Stmh0y2DcctzfMcWIo9blVPY-pwRvwpbXnAWL3OLX1kyUSTF6AdswBgZ8Dmczc8DTQh0mhesKKKhqlRUpNG8Vz86KG0i9btEXetVjx8yVx1mUo',
    showPartnershipSelection: true,
    partnershipSubtitle: 'Catalog Picks',
    partnershipTitle: 'Curated Selection',
    showSharedJourney: true,
    sharedJourneySubtitle: 'Community Gallery',
    sharedJourneyTitle: 'Skincare Moments',
    showReachReliability: true,
    reachSubtitle: 'Delivery & Policy',
    reachTitle: 'Nationwide Bangladesh Service',
    reachDescription: 'Cash on Delivery across all 64 districts with transparent shipping rates and a 48-hour damaged or incorrect item reporting policy.',
    showBestsellingRituals: true,
    bestsellingSubtitle: 'Routine Favorites',
    bestsellingTitle: 'Popular Skincare Picks',
    bestsellingDescription: 'Live products from our Bangladesh skincare catalog.',
    showBottomBanner: true,
    bottomBannerSubtitle: 'Need Guidance?',
    bottomBannerTitle: 'Build a Routine That Fits Your Skin',
    bottomBannerDescription: 'Take our Skin Profile Quiz or check our Authenticity & Inspection Guide before ordering.',
    bottomPrimaryBtnText: 'Contact Support',
    bottomPrimaryBtnLink: '/contact-us',
    bottomSecondaryBtnText: 'Explore Full Collection',
    bottomSecondaryBtnLink: '/shop',
  },
  contact: {
    badgeText: 'Get In Touch',
    title: 'Contact Our Skincare Desk',
    subtitle: 'Have questions about a product, shipping, or routine layering? Drop us a line below or reach out directly through WhatsApp.',
    channelsHeading: 'Direct Support Channels',
    whatsappLabel: 'WhatsApp Live Chat',
    whatsappNumber: '+880 1755-837545',
    emailLabel: 'Email Assistance',
    emailAddress: 'koreanskinfood.bd@gmail.com',
    locationLabel: 'Skincare Hub Location',
    locationAddress: 'Banani Road 11, Dhaka, Bangladesh',
    showPromiseBox: true,
    promiseHeading: 'Our Customer Commitments',
    promises: [
      'Sealed packaging & batch/expiry check before dispatch',
      'Clear Cash on Delivery across Bangladesh',
      '48-hour damaged or wrong-item photo/video support',
    ],
    showInquiryForm: true,
    formHeading: 'Skincare Consultation Inquiry',
    formSubtitle: 'Provide details about your concerns for routine suggestions.',
    formSubmitButtonText: 'Send Skincare Inquiry',
    successHeading: 'Inquiry Received Safely!',
    successMessage: 'Our team will review your note and get in touch with you shortly.',
    showFaqs: true,
    faqHeading: 'Frequently Asked Questions',
    faqSubtitle: 'Quick answers regarding shopping, shipping policy, and inspection.',
    faqs: [
      {
        id: 'c-faq-1',
        question: 'How can I check product packaging and expiry before use?',
        answer: 'Every product arrives with its outer seal and printed batch/expiration code. Visit our Authenticity & Inspection Guide for steps on reading Korean MFG/EXP formats before opening the seal.',
      },
      {
        id: 'c-faq-2',
        question: 'What are the delivery charges in Bangladesh?',
        answer: 'We offer standard cash on delivery (COD) services across Bangladesh. The delivery fee is ৳80 inside Dhaka City and ৳150 outside Dhaka City. Free delivery is available for orders above ৳2,000.',
      },
      {
        id: 'c-faq-3',
        question: 'How long does delivery take?',
        answer: 'Orders inside Dhaka City are typically delivered within 24 to 48 hours. Orders outside Dhaka City are dispatched via reliable courier services and take 3 to 5 business days to arrive at your doorstep.',
      },
      {
        id: 'c-faq-4',
        question: 'Can I get a personalized skin consultation?',
        answer: 'Yes, we provide free skincare consultation! Fill out our contact form indicating your Skin Type and specific concern (e.g. hyperpigmentation, acne, dryness), and our beauty consultant will suggest the ideal Korean skincare routine.',
      },
    ],
  },
  privacy: {
    heroBadge: 'Customer Trust & Data Protection',
    title: 'Privacy Policy',
    subtitle: 'We value the trust you place in Korean Skin Food Bangladesh. This policy transparently explains what data we collect, how we handle your orders and consultations, and how your privacy is vigorously safeguarded.',
    lastUpdatedLabel: 'Last Updated: October 2026',
    appliesToLabel: 'Applies to: All Web & Store Users',
    showGuaranteeBox: true,
    guaranteeTitle: 'No Data Selling Guarantee',
    guaranteeBody: 'Korean Skin Food BD never sells, rents, or trades your personal information, phone numbers, or beauty consults to third-party telemarketers or external brokers.',
    sections: [
      {
        id: 'collection',
        title: '1. Information We Collect',
        body: 'When you visit our online store, create an account, purchase authentic Korean skincare products, or chat with our beauty advisers, we collect personal identifiers (name, delivery address, active phone number, email), order & transaction records, voluntary skincare consultation notes, and essential device telemetry to optimize mobile browsing.',
      },
      {
        id: 'usage',
        title: '2. How We Use Your Data',
        body: 'We process your personal information solely for lawful store operations including:',
        bullets: [
          'Fulfilling & Delivering Orders across Dhaka and nationwide Bangladesh.',
          'Providing SMS, WhatsApp, or phone notifications for order confirmations and courier tracking.',
          'Offering tailored Korean skincare routine guidance via customer support or AI consultation.',
          'Preventing fraudulent orders and safeguarding platform integrity.',
        ],
      },
      {
        id: 'sharing',
        title: '3. Data Sharing & Couriers',
        body: 'We strictly limit third-party disclosures to licensed Bangladeshi courier partners (such as Steadfast Courier, Paperfly, and RedX) strictly to execute parcel deliveries, encrypted Google Cloud / Firebase hosting providers, and competent authorities when required by law.',
      },
      {
        id: 'cookies',
        title: '4. Cookies & Analytics',
        body: 'Our web store uses lightweight browser storage and cookies to maintain your shopping cart items, remember language preferences (English or Bengali), and measure site performance via Google Analytics 4 and Meta Conversions API.',
      },
      {
        id: 'security',
        title: '5. Security & Retention',
        body: 'All communications with our store are encrypted via TLS/HTTPS. Internal database access is restricted by strict role-based access control (RBAC) to verified administrators only. Transaction records are retained only as required by Bangladesh trade and tax guidelines.',
      },
      {
        id: 'rights',
        title: '6. Your Rights & Choices',
        body: 'You retain full control over your personal data: access or edit delivery details via your Profile at any time, opt out of promotional alerts with a single message, or request permanent account deletion via our privacy desk.',
      },
      {
        id: 'contact',
        title: '7. Privacy Contact Desk',
        body: 'For questions regarding this policy, data correction requests, or exercising your privacy rights, please reach out to our dedicated support team below.',
      },
    ],
    contactEmail: 'koreanskinfood.bd@gmail.com',
    contactPhone: '+880 1755-837545',
    contactAddress: 'Banani Road 11, Dhaka, Bangladesh',
    showFooterNav: true,
  },
  terms: {
    heroBadge: 'Customer Agreement & Store Terms',
    title: 'Terms of Service',
    subtitle: 'Welcome to Korean Skin Food Bangladesh. Please read these terms carefully before placing an order or using our online store. By using our website and services, you agree to these legal conditions.',
    effectiveDateLabel: 'Effective: 2026 / Ongoing',
    jurisdictionLabel: 'Governed by: Laws of Bangladesh',
    showAuthenticityCard: true,
    authenticityCardTitle: 'Sealed Packaging & Batch Transparency',
    authenticityCardBody: 'Every order is inspected for intact outer packaging, printed batch/expiry dates, and protective transit packing before dispatch.',
    showShippingRates: true,
    insideDhakaRate: '৳80 COD',
    outsideDhakaRate: '৳150 COD',
    freeShippingThreshold: 'Above ৳2,000',
    sections: [
      {
        id: 'authenticity',
        title: '1. Product Inspection & Sealed Packaging',
        body: 'Korean Skin Food Bangladesh inspects inventory for intact manufacturer seals and legible batch/expiry markings prior to dispatch. Customers may review batch and expiry guidance on our Authenticity & Inspection page.',
      },
      {
        id: 'orders-pricing',
        title: '2. Pricing, Currency & Orders',
        body: 'All retail and wholesale prices are listed in Bangladeshi Taka (৳ / BDT) reflecting import duties and statutory fees. Prices shown at checkout are final for that order.',
        bullets: [
          'Bangladeshi Taka (BDT) standard pricing with transparent discounts.',
          'Phone or SMS order verification may be required prior to courier dispatch.',
          'We reserve the right to cancel unconfirmed or suspected fraudulent orders.',
        ],
      },
      {
        id: 'shipping-delivery',
        title: '3. Shipping & Cash on Delivery',
        body: 'We deliver nationwide across all 64 districts in Bangladesh via trusted courier partners. Inside Dhaka deliveries typically take 24 to 48 hours; outside Dhaka takes 3 to 5 business days.',
      },
      {
        id: 'returns-refunds',
        title: '4. Returns, Exchanges & Refunds',
        body: 'Because skincare formulations are personal hygiene products, notify us within 48 hours of receipt with photo/video evidence for damaged or incorrect items. Unsealed, opened, or swatched products are non-returnable unless defective. Approved refunds settle within 5 to 7 business days.',
      },
      {
        id: 'skincare-disclaimer',
        title: '5. Skincare Advice & Disclaimer',
        body: 'Skincare recommendations from our advisors, routine builder, or AI assistant are for cosmetic education only and not medical advice. Individual skin biology varies—always perform a 24-hour patch test prior to full facial application of active ingredients such as Vitamin C, AHA/BHA, or Retinoids.',
      },
      {
        id: 'accounts-conduct',
        title: '6. User, Wholesale & Creator Accounts',
        body: 'Account holders are responsible for safeguarding credentials. Wholesale partners agree to honor MOQ and MSRP boundaries, and Creator affiliates agree to provide authentic product feedback complying with disclosure guidelines.',
      },
      {
        id: 'intellectual-property',
        title: '7. Intellectual Property',
        body: 'All digital assets, original photography, Bengali educational translations, logos, and editorial content remain the proprietary property of Korean Skin Food Bangladesh or licensed brand partners.',
      },
      {
        id: 'governing-law',
        title: '8. Governing Law & Jurisdiction',
        body: "These Terms of Service are governed by the laws of the People's Republic of Bangladesh, with exclusive jurisdiction in the competent courts of Dhaka, Bangladesh.",
      },
      {
        id: 'contact',
        title: '9. Customer Care & Inquiries',
        body: 'If you have questions about these terms, order tracking, or compliance, contact our support desk directly using the details below.',
      },
    ],
    contactEmail: 'koreanskinfood.bd@gmail.com',
    contactPhone: '+880 1755-837545',
    contactAddress: 'Banani Road 11, Dhaka, Bangladesh',
    showFooterNav: true,
  },
  becomeCreator: {
    heroBadge: 'Official K-Beauty Creator Network',
    heroTitleLine1: 'Turn Your Skincare Passion Into',
    heroTitleHighlight: 'Rewards, PR Gifts & Fame',
    heroSubtitle: "Join Korean Skin Food BD's Creator Program. Create authentic Facebook & Instagram reels, earn verified engagement points, climb the live leaderboard, and unlock curated PR boxes.",
    primaryCtaText: 'Apply to Become a Creator',
    secondaryCtaText: 'View Live Leaderboard',
    secondaryCtaLink: '/creator/leaderboard',
    showStats: true,
    stats: [
      { id: 'cs-1', value: 'K-Beauty', label: 'Curated Catalog' },
      { id: 'cs-2', value: '6 Tiers', label: 'Progressive Levels' },
      { id: 'cs-3', value: 'PR Boxes', label: 'Product Hampers' },
      { id: 'cs-4', value: 'Perks', label: 'Creator Rewards' },
    ],
    showPerks: true,
    perksEyebrow: 'Why Join Our Creator Squad',
    perksTitle: 'Everything You Need to Grow & Shine',
    perks: [
      { id: 'cp-1', title: 'Curated Skincare PR Boxes', desc: 'Receive curated Korean skincare products delivered straight to your door across Bangladesh.' },
      { id: 'cp-2', title: 'Points on Views & Likes', desc: 'Every Facebook Reel you share generates points based on verified views, likes, and comments.' },
      { id: 'cp-3', title: '6-Tier Level Progression', desc: 'Advance from Novice to Glow Ambassador to unlock discounts, PR hampers, and paid sponsorships.' },
      { id: 'cp-4', title: 'Live Public Leaderboard', desc: 'Get showcased on our store leaderboard, grow your audience, and build beauty authority.' },
      { id: 'cp-5', title: 'Home Store Showcase', desc: 'Top performing reels appear in our Community Live carousel for shoppers across Bangladesh.' },
      { id: 'cp-6', title: 'Creator Community Support', desc: 'Connect with our team for ingredient notes, campaign briefs, and new catalog arrivals.' },
    ],
    showSteps: true,
    stepsEyebrow: 'Easy 4-Step Process',
    stepsTitle: 'How to Become an Official Creator',
    steps: [
      { id: 'st-1', title: 'Apply with Your Profile', desc: 'Fill out the quick creator registration form below with your handle, phone, and skincare niche.' },
      { id: 'st-2', title: 'Admin Verification', desc: 'Our team reviews your submission within 24-48 hours and activates your Creator Account.' },
      { id: 'st-3', title: 'Create & Post Reels', desc: 'Create engaging Facebook & Instagram reels testing Korean skincare, and submit the link in your dashboard.' },
      { id: 'st-4', title: 'Earn Points & PR Gifts', desc: 'Climb the 6 tiers, level up to Glow Ambassador, claim free PR boxes, and earn campaign rewards.' },
    ],
    showTiers: true,
    tiersEyebrow: 'Progression Roadmap',
    tiersTitle: 'Creator Tiers & Exclusive Perks',
    tiersSubtitle: 'The more quality reels you post and engagement you generate, the higher your tier and rewards.',
    formTitle: 'Creator Application Form',
    formSubtitle: 'Fill in your creator handle, social links, and phone number to apply for review.',
    showFaqs: true,
    faqsEyebrow: 'Questions & Answers',
    faqsTitle: 'Frequently Asked Questions',
    faqs: [
      {
        id: 'bc-faq-1',
        question: 'Who can apply to become a creator?',
        answer: 'Anyone in Bangladesh passionate about skincare, Korean beauty cosmetics, barrier repair routines, and video creation! Whether you have 500 followers or 50,000, we value genuine reviews and engaging video reels.',
      },
      {
        id: 'bc-faq-2',
        question: 'How does the Creator Points & Monetization system work?',
        answer: 'Once approved, post Facebook or Instagram reels reviewing Korean skincare and submit the link in your dashboard. Verified views, likes, and comments convert into Creator Points to unlock rewards and bonuses.',
      },
      {
        id: 'bc-faq-3',
        question: 'How do I receive Korean Skincare PR Boxes?',
        answer: 'Approved creators who reach Level 2 (Glow Enthusiast) and above qualify for curated PR products delivered via courier across Bangladesh.',
      },
      {
        id: 'bc-faq-4',
        question: 'How long does the application approval take?',
        answer: 'Our admin team reviews submissions usually within 24 to 48 hours and sends confirmation via WhatsApp or phone.',
      },
      {
        id: 'bc-faq-5',
        question: 'Is there any fee or cost to join the creator program?',
        answer: 'No! Joining the Korean Skin Food BD Creator Program is free.',
      },
    ],
    showBottomBanner: true,
    bottomTitle: 'Have Questions Before Applying?',
    bottomSubtitle: 'Talk directly with our Creator Management team on WhatsApp or Messenger.',
    bottomMessengerLabel: 'Messenger Chat',
    bottomMessengerUrl: 'https://m.me/651561268050601',
    bottomApplyLabel: 'Apply Now',
  },
  brandsIndex: {
    badgeText: 'Korean Skincare Brands Directory',
    title: 'Korean Skincare Brands in Bangladesh',
    subtitle: 'Browse Korean skincare brands stocked at Korean Skin Food BD with key ingredient highlights, routine categories, and nationwide delivery.',
    searchPlaceholder: 'Search Korean brand (e.g. COSRX, SKIN1004, Anua)...',
    showFeaturedSection: true,
    featuredTitle: 'Featured K-Beauty Brands',
    featuredCtaLabel: 'Explore Brand Catalog',
    showDirectorySection: true,
    directoryTitle: 'Complete Brand Directory',
  },
  brandLanding: {
    authenticityBadge: 'Korean Skincare Brand',
    defaultHeroImage: '/og-banner.jpg',
    catalogHeadingPrefix: 'Available Products',
    catalogSubtext: 'Available in stock with Cash on Delivery across Bangladesh.',
    emptyStateTitle: 'Catalog Updates Arriving Soon',
    emptyStateCtaLabel: 'Browse All Korean Skincare',
    emptyStateCtaLink: '/shop',
    showSignatureIngredients: true,
    showFaqs: true,
    faqHeadingPrefix: 'Frequently Asked Questions',
    faqSubtext: 'Guidance on packaging inspection, suitable skin types, and delivery terms.',
  },
  guidesIndex: {
    badgeText: 'K-Beauty Educational Knowledge Base',
    titleEN: 'Korean Skincare Guides for Bangladesh',
    titleBN: 'বাংলাদেশে কোরিয়ান স্কিন কেয়ার সহায়িকা',
    subtitleEN: 'Climate-conscious guidance on building balanced skincare routines, decoding active ingredients, and caring for your skin barrier.',
    subtitleBN: 'আমাদের আবহাওয়ার সাথে মানানসই কোরিয়ান স্কিন কেয়ার রুটিন ও উপাদান পরিচিতি।',
    readGuideLabelEN: 'Read Complete Guide',
    readGuideLabelBN: 'সম্পূর্ণ গাইড পড়ুন',
    showLanguageSwitcher: true,
    showCategoryTabs: true,
  },
  guideDetail: {
    showLanguageSwitcher: true,
    featuredActivesHeading: 'Featured Skincare Actives Discussed',
    showFaqs: true,
    faqHeadingEN: 'Frequently Asked Questions',
    faqHeadingBN: 'সাধারণ জিজ্ঞাসা (FAQ)',
    faqSubtext: 'Clear answers to common questions about this skincare topic in Bangladesh.',
    showRelatedProducts: true,
    relatedHeading: 'Recommended Products from Our Catalog',
    relatedSubtext: 'Live catalog products matching the routine principles outlined in this guide.',
    relatedCtaLabel: 'View All Products →',
  },
  productDetail: {
    trustBadge1: 'Batch & Seal Checked',
    trustBadge2: '48-Hr Issue Support',
    showSocialShareBox: true,
    shareBoxTitle: 'Share This Product',
    shareBoxSubtitle: 'Share product link with friends',
    addToBasketLabel: 'Add to Skincare Basket',
    wholesaleCtaLabel: 'Order Wholesale & Proceed to Checkout',
    whatsappCtaLabel: 'Order via WhatsApp',
    showReviewsSection: true,
    reviewsHeading: 'Customer Reviews & Photos',
    showRelatedSection: true,
    relatedHeading: 'Discover More K-Beauty',
    relatedSubtext: 'Related products from the same brand or category.',
  },
  login: {
    title: 'Welcome to Korean Skin Food BD',
    subtitle: 'Sign in to access your custom e-commerce profile, view previous orders, and enjoy personalized K-Beauty recommendations.',
    googleButtonText: 'Continue with Google',
    securityBadgeText: '100% Secure Auth',
    backToShopLabel: 'Back to Shop',
    backToShopLink: '/',
  },
  notFound: {
    badgeText: 'Error 404',
    title: 'Page Not Found',
    description: 'The link you followed may be broken or the page may have been removed. Discover authentic Korean cosmeceuticals and skincare routines below:',
    homeBtnLabel: 'Return Home',
    shopBtnLabel: 'Browse Skincare Shop',
    brandsBtnLabel: 'Explore Brands',
    guidesBtnLabel: 'Skincare Guides',
    showQuickLinks: true,
  },
  authenticity: {
    badgeEN: 'Authenticity & Inspection Center',
    badgeBN: 'অথেনটিসিটি ও পণ্য যাচাই গাইড',
    titleEN: 'How to Inspect Batch Codes, Seals & Expiry on Korean Skincare',
    titleBN: 'কোরিয়ান স্কিন কেয়ার পণ্যের ব্যাচ কোড, সিল ও মেয়াদ যাচাই নির্দেশিকা',
    subtitleEN: 'Practical steps for checking Korean MFG/EXP dates, packaging seals, and Period-After-Opening symbols upon delivery in Bangladesh—plus how to reach our support desk if anything looks amiss.',
    subtitleBN: 'সিল খোলা ছাড়াই পণ্যের মেয়াদ, ব্যাচ কোড এবং ডেলিভারি কন্ডিশন কীভাবে যাচাই করবেন তা জানুন। ডেলিভারির পর কোনো সমস্যা দেখা দিলে আমাদের ৪৮ ঘণ্টার সাপোর্ট ডেস্ক পাশে আছে।',
    primaryCtaEN: 'Browse Skincare Catalog',
    primaryCtaBN: 'সব পণ্য দেখুন',
    primaryCtaLink: '/shop',
    secondaryCtaEN: 'Report a Parcel Issue',
    secondaryCtaBN: 'সমস্যা রিপোর্ট / যোগাযোগ',
    secondaryCtaLink: '/contact-us',
    showChecklist: true,
    showDateCodes: true,
    dateCodesHeadingEN: 'Common Date Markings on Korean Packaging',
    dateCodesHeadingBN: 'কোরিয়ান প্যাকেজিংয়ের সাধারণ তারিখ শব্দ',
    showPolicyCards: true,
    showHelpBanner: true,
    helpTitleEN: 'Need Help Checking an Order or Batch Code?',
    helpTitleBN: 'আপনার অর্ডার বা পণ্য নিয়ে কোনো প্রশ্ন আছে?',
    helpSubtitleEN: 'Message our support desk with your Order ID and a photo of the box/bottom stamp, or open a ticket from your profile.',
    helpSubtitleBN: 'অর্ডার আইডি এবং প্যাকেজের ছবিসহ আমাদের সাপোর্ট ডেস্ক বা প্রোফাইল টিকিট সেকশনে যোগাযোগ করুন।',
    helpSecondaryLabelEN: 'Terms & Returns',
    helpSecondaryLabelBN: 'নীতিমালা',
    helpSecondaryLink: '/terms-of-service',
    helpPrimaryLabelEN: 'Contact Support',
    helpPrimaryLabelBN: 'যোগাযোগ করুন',
    helpPrimaryLink: '/contact-us',
  },
  ingredients: {
    badgeText: 'K-Beauty Ingredient Glossary',
    titleEN: 'Korean Skincare Ingredients Library',
    titleBN: 'কোরিয়ান স্কিনকেয়ার ইনগ্রেডিয়েন্ট লাইব্রেরি',
    subtitleEN: 'Understand what flagship Korean skincare actives do, which skin types benefit most, what they pair with, and live formulas available in Bangladesh.',
    subtitleBN: 'সেন্টেলা, নায়াসিনামাইড, স্নেইল মিউসিন, হায়ালুরনিক অ্যাসিডসহ জনপ্রিয় কোরীয় স্কিনকেয়ার উপাদান কীভাবে কাজ করে এবং কার সাথে ব্যবহার করা নিরাপদ তা জানুন।',
    searchPlaceholderEN: 'Search ingredient (e.g. Cica, Retinol)...',
    searchPlaceholderBN: 'উপাদান খুঁজুন (যেমন: Cica, Retinol)...',
    cardCtaLabel: 'Read guide',
    showBottomBanner: true,
    bottomTitleEN: 'Prefer shopping by skin goal or routine step?',
    bottomTitleBN: 'ত্বকের সমস্যা অনুযায়ী খুঁজতে চান?',
    bottomSubtitle: 'Explore Skin Concerns, take our 1-minute Skin Profile Quiz, or check active compatibility in the Routine Builder.',
    bottomSecondaryLabel: 'Skin Concerns',
    bottomSecondaryLink: '/concerns',
    bottomPrimaryLabel: 'Take Skin Quiz',
    bottomPrimaryLink: '/skin-quiz',
    detailBadgeText: 'Cosmetic Ingredient Education',
    detailDisclaimer: 'Cosmetic education only: individual tolerance varies. Introduce one new active formula at a time and perform a 24-hour jawline or inner-arm patch test before full-face application.',
    showDetailRelatedProducts: true,
  },
  concerns: {
    badgeText: 'Targeted Korean Skincare Education',
    titleEN: 'Shop & Learn by Skin Concern',
    titleBN: 'ত্বকের সমস্যা অনুযায়ী সমাধান ও রুটিন',
    subtitleEN: 'Explore practical Korean skincare approaches tailored for Bangladesh heat, humidity, indoor AC dehydration, and daily sun exposure.',
    subtitleBN: 'বাংলাদেশের আবহাওয়া উপযোগী কোরিয়ান স্কিনকেয়ার রুটিন সাজাতে নিচের সমস্যাগুলো থেকে আপনার ত্বকের লক্ষ্য বেছে নিন।',
    cardCtaLabel: 'Explore solutions',
    detailBadgeFallback: 'Bangladesh Climate Routine Guide',
    detailDisclaimer: 'Skincare products are cosmetic care—not medical treatments. For persistent or painful dermatological conditions, please consult a qualified dermatologist alongside gentle daily cleansing and sun protection.',
    showDetailKeyIngredients: true,
    showDetailRelatedProducts: true,
  },
  skinQuiz: {
    badgeText: 'Personalized Routine Finder',
    titleEN: 'Korean Skincare Profile Quiz',
    titleBN: 'আপনার স্কিন প্রোফাইল কুইজ',
    subtitleEN: 'Answer 5 quick questions about your skin behavior in Bangladesh weather to generate an in-stock catalog shortlist.',
    subtitleBN: '৫টি সহজ প্রশ্নের উত্তর দিন এবং আমাদের লাইভ বাংলাদেশ ক্যাটালগ থেকে আপনার ত্বকের ধরন অনুযায়ী সাজানো প্রডাক্ট শর্টলিস্ট পান।',
    resetButtonLabel: 'Reset Answers',
    submitButtonLabel: 'Show My Catalog Matches & Save Profile',
    resultsHeading: 'Your Matched In-Stock Shortlist',
    resultsSubtext: 'Selected across Cleanser, Serum/Toner, Moisturizer, and Sunscreen categories where available in stock.',
    routineBuilderCtaLabel: 'Customize in Routine Builder',
    addTopToBagCtaLabel: 'Add Top 4 to Bag',
    showResultsActions: true,
  },
  routineBuilder: {
    badgeText: 'Interactive Routine Planner',
    titleEN: 'AM & PM Skincare Routine Builder',
    titleBN: 'AM ও PM স্কিনকেয়ার রুটিন বিল্ডার',
    subtitle: 'Pair live in-stock Korean skincare steps for morning and evening while checking active ingredient compatibility.',
    quizCtaLabel: 'Take Skin Quiz',
    glossaryCtaLabel: 'Ingredient Glossary',
    amTitle: 'Morning Routine (AM)',
    amSubtitle: 'Cleanse, hydrate, antioxidant support, and daily SPF',
    pmTitle: 'Evening Routine (PM)',
    pmSubtitle: 'Remove sunscreen, treat targeted concerns, and lock in barrier moisture',
    saveRoutineLabel: 'Save Routine',
    addToCartLabel: 'Add Selected to Cart',
    showLayeringWarnings: true,
    showSavedRoutines: true,
  },
  checkout: {
    titleEN: 'Checkout & Delivery Details',
    titleBN: 'অর্ডার চেকআউট',
    subtitleEN: 'Cash on Delivery across Bangladesh · Phone Confirmation Dispatch',
    subtitleBN: 'সারা বাংলাদেশে ক্যাশ অন ডেলিভারি সুবিধা · সরাসরি ফোন কনফার্মেশন',
    copyLinkLabelEN: 'Copy Checkout Link',
    copyLinkLabelBN: 'চেকআউট লিংক কপি',
    continueShoppingLabelEN: 'Continue Shopping',
    continueShoppingLabelBN: 'শপিং চালিয়ে যান',
    emptyTitleEN: 'Your Checkout Basket is Empty',
    emptyTitleBN: 'আপনার চেকআউট কার্টটি খালি',
    emptySubtitleEN: 'Add products directly below to start an instant order, or browse our full K-Beauty catalog.',
    emptySubtitleBN: 'সরাসরি এখান থেকে পছন্দের পণ্য যোগ করুন অথবা আমাদের শপ ক্যাটালগ থেকে বেছে নিন।',
    emptyShopBtnEN: 'Browse Shop Catalog',
    emptyShopBtnBN: 'শপ ক্যাটালগ দেখুন',
    showQuickAdd: true,
    showGuestRewardsBanner: true,
    paymentTitleEN: 'Payment Method',
    paymentTitleBN: 'পেমেন্ট পদ্ধতি',
    paymentCodDescEN: 'Pay in cash upon receiving your parcel at your doorstep anywhere in Bangladesh.',
    paymentCodDescBN: 'পণ্য হাতে পেয়ে যাচাই করে ডেলিভারি ম্যানের কাছে মূল্য পরিশোধ করুন।',
    promoTitleEN: 'Promo / Discount Code',
    promoTitleBN: 'প্রমো কোড / কুপন',
    promoPlaceholderEN: 'Enter promo code (e.g. FREEDELIVERY)',
    promoPlaceholderBN: 'কুপন কোড লিখুন...',
    summaryTitleEN: 'Order Summary',
    summaryTitleBN: 'অর্ডার সারাংশ',
    dispatchNoteEN: 'Our team confirms every Cash on Delivery order by phone before dispatch.',
    dispatchNoteBN: 'অর্ডার নিশ্চিত করলে ডেলিভারির আগে আমাদের টিম কল করে কনফার্ম করবে।',
  },
  thankYou: {
    titleEN: 'Thank You! Your Order is Confirmed',
    titleBN: 'আপনার অর্ডারটি নিশ্চিত হয়েছে!',
    subtitleEN: 'Thank you for shopping with Korean Skin Food BD. Our fulfillment desk is preparing your parcel and will confirm via phone before dispatch.',
    subtitleBN: 'কোরিয়ান স্কিন ফুড বিডি থেকে কেনাকাটার জন্য ধন্যবাদ। ডেলিভারির আগে আমাদের টিম আপনার নম্বরে কল করে অর্ডার কনফার্ম করবে।',
    deliveryHeadingEN: 'Delivery & Contact Details',
    deliveryHeadingBN: 'ডেলিভারি তথ্য',
    receiptHeadingEN: 'Order Receipt Summary',
    receiptHeadingBN: 'অর্ডার রসিদ',
    printBtnEN: 'Print Receipt',
    printBtnBN: 'রসিদ প্রিন্ট',
    whatsappBtnEN: 'WhatsApp Help',
    whatsappBtnBN: 'হোয়াটসঅ্যাপ সাপোর্ট',
    continueShoppingEN: 'Continue Shopping',
    continueShoppingBN: 'আরও শপিং করুন',
    showGuestRewardsTip: true,
    notFoundTitleEN: 'Order Receipt Not Found',
    notFoundTitleBN: 'কোনো সাম্প্রতিক অর্ডার পাওয়া যায়নি',
  },
  creatorLeaderboard: {
    badgeText: 'Official K-Beauty Ranking',
    title: 'Creator Performance Leaderboard',
    subtitle: 'Real-time verified creator rankings based on total engagement points, Facebook video views, likes, and comments.',
    searchPlaceholder: 'Search creator name or username...',
    showPeriodTabs: true,
    showSearchBar: true,
    showCriteriaStrip: true,
  },
  wholesalePortal: {
    dashboardBadge: 'Wholesale Portal',
    dashboardSubtitle: 'Manage your B2B orders, ledger balance, and store profile.',
    placeOrderBtnLabel: 'Place Wholesale Order',
    checkoutBreadcrumbLabel: 'B2B Wholesale Checkout',
    checkoutTitle: 'Wholesale Cart & Checkout',
    checkoutTierBadge: 'B2B Tiered Pricing',
    addProductsBtnLabel: 'Add More Products',
    showAuthNotice: true,
    authNoticeTitle: 'Wholesale Account Pending / Guest Preview',
    authNoticeBody: 'You are currently viewing tiered wholesale pricing. To complete authorized wholesale orders with custom delivery terms or credit limits, ensure your wholesale partner status is approved.',
  },
  profile: {
    fallbackDisplayName: 'K-Beauty Shopper',
    ordersTabLabel: 'Orders',
    wishlistTabLabel: 'Wishlist',
    addressesTabLabel: 'Addresses',
    routineTabLabel: 'Skin & Routine',
    loyaltyTabLabel: 'Loyalty',
    reviewsTabLabel: 'My Reviews',
    supportTabLabel: 'Support',
    accountTabLabel: 'Account Info',
    showQuickMetrics: true,
    showRoleBanners: true,
  },
};

function mergeGlobalTheme(data?: Partial<GlobalThemeSettings> | null): GlobalThemeSettings {
  const safe = data || {};
  const headingFont = (!safe.headingFont || safe.headingFont === 'Playfair Display') ? 'Hind Siliguri' : safe.headingFont;
  const bodyFont = (!safe.bodyFont || safe.bodyFont === 'Plus Jakarta Sans') ? 'Open Sans' : safe.bodyFont;
  const rawCols: Partial<FooterColumnsSettings> = safe.footerColumns || {};
  return {
    ...DEFAULT_GLOBAL_THEME,
    ...safe,
    headingFont,
    bodyFont,
    footerColumns: {
      store: {
        title: rawCols.store?.title || DEFAULT_FOOTER_COLUMNS.store.title,
        links: Array.isArray(rawCols.store?.links) && rawCols.store.links.length > 0
          ? rawCols.store.links
          : DEFAULT_FOOTER_COLUMNS.store.links,
      },
      partners: {
        title: rawCols.partners?.title || DEFAULT_FOOTER_COLUMNS.partners.title,
        links: Array.isArray(rawCols.partners?.links) && rawCols.partners.links.length > 0
          ? rawCols.partners.links
          : DEFAULT_FOOTER_COLUMNS.partners.links,
      },
      legal: {
        title: rawCols.legal?.title || DEFAULT_FOOTER_COLUMNS.legal.title,
        links: Array.isArray(rawCols.legal?.links) && rawCols.legal.links.length > 0
          ? rawCols.legal.links
          : DEFAULT_FOOTER_COLUMNS.legal.links,
      },
    },
  };
}

function mergePagesTheme(data?: Partial<PagesThemeSettings> | null): PagesThemeSettings {
  const safe = data || {};
  return {
    about: { ...DEFAULT_PAGES_THEME.about, ...(safe.about || {}) },
    contact: {
      ...DEFAULT_PAGES_THEME.contact,
      ...(safe.contact || {}),
      promises: Array.isArray(safe.contact?.promises) ? safe.contact.promises : DEFAULT_PAGES_THEME.contact.promises,
      faqs: Array.isArray(safe.contact?.faqs) ? safe.contact.faqs : DEFAULT_PAGES_THEME.contact.faqs,
    },
    privacy: {
      ...DEFAULT_PAGES_THEME.privacy,
      ...(safe.privacy || {}),
      sections: Array.isArray(safe.privacy?.sections) ? safe.privacy.sections : DEFAULT_PAGES_THEME.privacy.sections,
    },
    terms: {
      ...DEFAULT_PAGES_THEME.terms,
      ...(safe.terms || {}),
      sections: Array.isArray(safe.terms?.sections) ? safe.terms.sections : DEFAULT_PAGES_THEME.terms.sections,
    },
    becomeCreator: {
      ...DEFAULT_PAGES_THEME.becomeCreator,
      ...(safe.becomeCreator || {}),
      stats: Array.isArray(safe.becomeCreator?.stats) ? safe.becomeCreator.stats : DEFAULT_PAGES_THEME.becomeCreator.stats,
      perks: Array.isArray(safe.becomeCreator?.perks) ? safe.becomeCreator.perks : DEFAULT_PAGES_THEME.becomeCreator.perks,
      steps: Array.isArray(safe.becomeCreator?.steps) ? safe.becomeCreator.steps : DEFAULT_PAGES_THEME.becomeCreator.steps,
      faqs: Array.isArray(safe.becomeCreator?.faqs) ? safe.becomeCreator.faqs : DEFAULT_PAGES_THEME.becomeCreator.faqs,
    },
    brandsIndex: { ...DEFAULT_PAGES_THEME.brandsIndex, ...(safe.brandsIndex || {}) },
    brandLanding: { ...DEFAULT_PAGES_THEME.brandLanding, ...(safe.brandLanding || {}) },
    guidesIndex: { ...DEFAULT_PAGES_THEME.guidesIndex, ...(safe.guidesIndex || {}) },
    guideDetail: { ...DEFAULT_PAGES_THEME.guideDetail, ...(safe.guideDetail || {}) },
    productDetail: { ...DEFAULT_PAGES_THEME.productDetail, ...(safe.productDetail || {}) },
    login: { ...DEFAULT_PAGES_THEME.login, ...(safe.login || {}) },
    notFound: { ...DEFAULT_PAGES_THEME.notFound, ...(safe.notFound || {}) },
    authenticity: { ...DEFAULT_PAGES_THEME.authenticity, ...(safe.authenticity || {}) },
    ingredients: { ...DEFAULT_PAGES_THEME.ingredients, ...(safe.ingredients || {}) },
    concerns: { ...DEFAULT_PAGES_THEME.concerns, ...(safe.concerns || {}) },
    skinQuiz: { ...DEFAULT_PAGES_THEME.skinQuiz, ...(safe.skinQuiz || {}) },
    routineBuilder: { ...DEFAULT_PAGES_THEME.routineBuilder, ...(safe.routineBuilder || {}) },
    checkout: { ...DEFAULT_PAGES_THEME.checkout, ...(safe.checkout || {}) },
    thankYou: { ...DEFAULT_PAGES_THEME.thankYou, ...(safe.thankYou || {}) },
    creatorLeaderboard: { ...DEFAULT_PAGES_THEME.creatorLeaderboard, ...(safe.creatorLeaderboard || {}) },
    wholesalePortal: { ...DEFAULT_PAGES_THEME.wholesalePortal, ...(safe.wholesalePortal || {}) },
    profile: { ...DEFAULT_PAGES_THEME.profile, ...(safe.profile || {}) },
    updatedAt: safe.updatedAt,
  };
}

const STORAGE_KEY = 'ksf_home_theme_settings';
const GLOBAL_STORAGE_KEY = 'ksf_global_theme_settings';
const SHOP_STORAGE_KEY = 'ksf_shop_theme_settings';
const PAGES_STORAGE_KEY = 'ksf_pages_theme_settings';

function loadGoogleFont(fontName: string) {
  if (!fontName || typeof document === 'undefined') return;
  const fontId = `google-font-${fontName.replace(/\s+/g, '-').toLowerCase()}`;
  if (document.getElementById(fontId)) return;
  const link = document.createElement('link');
  link.id = fontId;
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontName)}:wght@300;400;500;600;700;800;900&display=swap`;
  document.head.appendChild(link);
}

export function applyGlobalThemeToDOM(globalTheme: GlobalThemeSettings) {
  if (typeof document === 'undefined') return;

  // 1. Favicon
  if (globalTheme.faviconUrl) {
    let faviconElem = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
    if (!faviconElem) {
      faviconElem = document.createElement('link');
      faviconElem.rel = 'icon';
      document.head.appendChild(faviconElem);
    }
    faviconElem.href = globalTheme.faviconUrl;
  }

  // 2. Document Title
  if (globalTheme.siteTitle) {
    document.title = globalTheme.siteTagline
      ? `${globalTheme.siteTitle} | ${globalTheme.siteTagline}`
      : globalTheme.siteTitle;
  }

  // 3. Load Google Fonts
  if (globalTheme.headingFont) {
    loadGoogleFont(globalTheme.headingFont);
  }
  if (globalTheme.bodyFont) {
    loadGoogleFont(globalTheme.bodyFont);
  }

  // 4. Inject Dynamic CSS Variables
  let styleTag = document.getElementById('global-theme-dynamic-styles') as HTMLStyleElement;
  if (!styleTag) {
    styleTag = document.createElement('style');
    styleTag.id = 'global-theme-dynamic-styles';
    document.head.appendChild(styleTag);
  }

  const primary = globalTheme.primaryColor || '#E91E8C';
  const secondary = globalTheme.secondaryColor || '#FF62B2';
  const accent = globalTheme.accentColor || '#0F172A';
  const bg = globalTheme.backgroundColor || '#FFF5F8';
  const headingFont = globalTheme.headingFont || 'Hind Siliguri';
  const bodyFont = globalTheme.bodyFont || 'Open Sans';

  styleTag.innerHTML = `
    :root {
      --primary-color: ${primary};
      --secondary-color: ${secondary};
      --accent-color: ${accent};
      --bg-color: ${bg};
      --font-heading: '${headingFont}', 'Hind Siliguri', serif;
      --font-body: '${bodyFont}', 'Hind Siliguri', sans-serif;
    }
    body, html {
      font-family: var(--font-body) !important;
    }
    h1, h2, h3, h4, h5, h6, .font-serif, .font-serif-luxury, .font-heading {
      font-family: var(--font-heading) !important;
    }
    .theme-primary-bg {
      background-color: ${primary} !important;
    }
    .theme-primary-text {
      color: ${primary} !important;
    }
    .theme-primary-border {
      border-color: ${primary} !important;
    }
  `;
}

class ThemeService {
  private currentTheme: HomeThemeSettings = DEFAULT_HOME_THEME;
  private currentGlobalTheme: GlobalThemeSettings = DEFAULT_GLOBAL_THEME;
  private currentShopTheme: ShopThemeSettings = DEFAULT_SHOP_THEME;
  private currentPagesTheme: PagesThemeSettings = DEFAULT_PAGES_THEME;
  private listeners: ((theme: HomeThemeSettings) => void)[] = [];
  private globalListeners: ((globalTheme: GlobalThemeSettings) => void)[] = [];
  private shopListeners: ((shopTheme: ShopThemeSettings) => void)[] = [];
  private pagesListeners: ((pagesTheme: PagesThemeSettings) => void)[] = [];

  constructor() {
    this.init();
  }

  private sanitizeTheme(theme: HomeThemeSettings): HomeThemeSettings {
    const defaultReels = DEFAULT_HOME_THEME.communityLive.reels;
    const currentReels = theme.communityLive?.reels || defaultReels;
    
    // Ensure reels have playable video streams while preserving social postUrls
    let updatedReels: ReelItem[] = currentReels.map((reel, idx) => {
      const def = defaultReels[idx] || defaultReels[idx % defaultReels.length];
      let videoUrl = reel.videoUrl;
      let postUrl = reel.postUrl || '';

      // If user had stored the Facebook share link in videoUrl, move it to postUrl
      if (!postUrl && videoUrl && (videoUrl.includes('facebook.com') || videoUrl.includes('fb.watch') || videoUrl.includes('instagram.com'))) {
        postUrl = videoUrl;
      }

      // If videoUrl is not a direct video or is broken mixkit, use default playable stream
      if (!videoUrl || videoUrl.includes('mixkit.co') || videoUrl.includes('facebook.com') || videoUrl.includes('fb.watch') || videoUrl === '#' || videoUrl === 'https://facebook.com') {
        videoUrl = def?.videoUrl || 'https://res.cloudinary.com/demo/video/upload/q_auto,f_auto/v1611158652/samples/cld-sample-video.mp4';
      }

      return {
        ...reel,
        videoUrl,
        postUrl: postUrl || def?.postUrl || reel.postUrl || ''
      };
    });

    if (updatedReels.length < 6) {
      const additional = defaultReels.slice(updatedReels.length);
      updatedReels = [...updatedReels, ...additional];
    }

    const baseOrder = [...(theme.sectionOrder || DEFAULT_HOME_THEME.sectionOrder)].filter(s => s !== 'validatedFormulations');
    if (!baseOrder.includes('googleReviews')) {
      const bIdx = baseOrder.indexOf('botanicalEssentials');
      if (bIdx !== -1) {
        baseOrder.splice(bIdx + 1, 0, 'googleReviews');
      } else {
        baseOrder.push('googleReviews');
      }
    }

    return {
      ...theme,
      sectionOrder: baseOrder,
      googleReviews: {
        ...DEFAULT_HOME_THEME.googleReviews,
        ...(theme.googleReviews || {})
      },
      validatedFormulations: {
        ...(theme.validatedFormulations || DEFAULT_HOME_THEME.validatedFormulations),
        enabled: false
      },
      communityLive: {
        ...DEFAULT_HOME_THEME.communityLive,
        ...(theme.communityLive || {}),
        reels: updatedReels.length > 0 ? updatedReels : defaultReels
      }
    };
  }

  private init() {
    // 1. Try loading cached local home theme
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        this.currentTheme = this.sanitizeTheme({ ...DEFAULT_HOME_THEME, ...JSON.parse(cached) });
      } else {
        this.currentTheme = this.sanitizeTheme(DEFAULT_HOME_THEME);
      }
    } catch (err) {
      console.warn('[ThemeService] LocalStorage home load error:', err);
    }

    // 2. Try loading cached local global theme
    try {
      const cachedGlobal = localStorage.getItem(GLOBAL_STORAGE_KEY);
      if (cachedGlobal) {
        this.currentGlobalTheme = mergeGlobalTheme(JSON.parse(cachedGlobal));
      } else {
        this.currentGlobalTheme = mergeGlobalTheme(DEFAULT_GLOBAL_THEME);
      }
      applyGlobalThemeToDOM(this.currentGlobalTheme);
    } catch (err) {
      console.warn('[ThemeService] LocalStorage global load error:', err);
    }

    // 2b. Try loading cached local shop theme
    try {
      const cachedShop = localStorage.getItem(SHOP_STORAGE_KEY);
      if (cachedShop) {
        this.currentShopTheme = { ...DEFAULT_SHOP_THEME, ...JSON.parse(cachedShop) };
      } else {
        this.currentShopTheme = { ...DEFAULT_SHOP_THEME };
      }
    } catch (err) {
      console.warn('[ThemeService] LocalStorage shop load error:', err);
    }

    // 2c. Try loading cached local pages theme
    try {
      const cachedPages = localStorage.getItem(PAGES_STORAGE_KEY);
      if (cachedPages) {
        this.currentPagesTheme = mergePagesTheme(JSON.parse(cachedPages));
      } else {
        this.currentPagesTheme = mergePagesTheme(DEFAULT_PAGES_THEME);
      }
    } catch (err) {
      console.warn('[ThemeService] LocalStorage pages load error:', err);
    }

    // 3. Subscribe to Firestore real-time updates for site_settings/theme_home
    try {
      const docRef = doc(db, 'site_settings', 'theme_home');
      onSnapshot(
        docRef,
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data() as HomeThemeSettings;
            this.currentTheme = this.sanitizeTheme({ ...DEFAULT_HOME_THEME, ...data });
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.currentTheme));
            this.notifyListeners();
            try {
              queryClient.setQueryData(queryKeys.settings.homeTheme(), this.currentTheme);
            } catch {}
          }
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, 'site_settings/theme_home', false);
        }
      );
    } catch (err) {
      console.warn('[ThemeService] Firestore home listener init warning:', err);
    }

    // 4. Subscribe to Firestore real-time updates for site_settings/theme_global
    try {
      const globalDocRef = doc(db, 'site_settings', 'theme_global');
      onSnapshot(
        globalDocRef,
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data() as GlobalThemeSettings;
            this.currentGlobalTheme = mergeGlobalTheme(data);
            localStorage.setItem(GLOBAL_STORAGE_KEY, JSON.stringify(this.currentGlobalTheme));
            applyGlobalThemeToDOM(this.currentGlobalTheme);
            this.notifyGlobalListeners();
            try {
              queryClient.setQueryData(queryKeys.settings.globalTheme(), this.currentGlobalTheme);
            } catch {}
          }
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, 'site_settings/theme_global', false);
        }
      );
    } catch (err) {
      console.warn('[ThemeService] Firestore global listener init warning:', err);
    }

    // 5. Subscribe to Firestore real-time updates for site_settings/theme_shop
    try {
      const shopDocRef = doc(db, 'site_settings', 'theme_shop');
      onSnapshot(
        shopDocRef,
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data() as ShopThemeSettings;
            this.currentShopTheme = { ...DEFAULT_SHOP_THEME, ...data };
            localStorage.setItem(SHOP_STORAGE_KEY, JSON.stringify(this.currentShopTheme));
            this.notifyShopListeners();
            try {
              queryClient.setQueryData(queryKeys.settings.shopTheme(), this.currentShopTheme);
            } catch {}
          }
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, 'site_settings/theme_shop', false);
        }
      );
    } catch (err) {
      console.warn('[ThemeService] Firestore shop listener init warning:', err);
    }

    // 6. Subscribe to Firestore real-time updates for site_settings/theme_pages
    try {
      const pagesDocRef = doc(db, 'site_settings', 'theme_pages');
      onSnapshot(
        pagesDocRef,
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data() as Partial<PagesThemeSettings>;
            this.currentPagesTheme = mergePagesTheme(data);
            localStorage.setItem(PAGES_STORAGE_KEY, JSON.stringify(this.currentPagesTheme));
            this.notifyPagesListeners();
            try {
              queryClient.setQueryData(queryKeys.settings.pagesTheme(), this.currentPagesTheme);
            } catch {}
          }
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, 'site_settings/theme_pages', false);
        }
      );
    } catch (err) {
      console.warn('[ThemeService] Firestore pages listener init warning:', err);
    }
  }

  public getHomeTheme(): HomeThemeSettings {
    return this.currentTheme;
  }

  public getGlobalTheme(): GlobalThemeSettings {
    return this.currentGlobalTheme;
  }

  public getShopTheme(): ShopThemeSettings {
    return this.currentShopTheme;
  }

  public getPagesTheme(): PagesThemeSettings {
    return this.currentPagesTheme;
  }

  public async saveHomeTheme(settings: HomeThemeSettings): Promise<void> {
    const updated: HomeThemeSettings = this.sanitizeTheme({
      ...settings,
      updatedAt: new Date().toISOString()
    });
    this.currentTheme = updated;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    this.notifyListeners();
    try {
      queryClient.setQueryData(queryKeys.settings.homeTheme(), updated);
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.homeTheme() });
    } catch {}

    try {
      const docRef = doc(db, 'site_settings', 'theme_home');
      await setDoc(docRef, sanitizeForFirestore(updated), { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'site_settings/theme_home', false);
    }
  }

  public async saveGlobalTheme(settings: GlobalThemeSettings): Promise<void> {
    const updated: GlobalThemeSettings = mergeGlobalTheme({
      ...settings,
      updatedAt: new Date().toISOString()
    });
    this.currentGlobalTheme = updated;
    localStorage.setItem(GLOBAL_STORAGE_KEY, JSON.stringify(updated));
    applyGlobalThemeToDOM(updated);
    this.notifyGlobalListeners();
    try {
      queryClient.setQueryData(queryKeys.settings.globalTheme(), updated);
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.globalTheme() });
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.site() });
    } catch {}

    try {
      const docRef = doc(db, 'site_settings', 'theme_global');
      await setDoc(docRef, sanitizeForFirestore(updated), { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'site_settings/theme_global', false);
    }
  }

  public async saveShopTheme(settings: ShopThemeSettings): Promise<void> {
    const updated: ShopThemeSettings = {
      ...settings,
      updatedAt: new Date().toISOString()
    };
    this.currentShopTheme = updated;
    localStorage.setItem(SHOP_STORAGE_KEY, JSON.stringify(updated));
    this.notifyShopListeners();
    try {
      queryClient.setQueryData(queryKeys.settings.shopTheme(), updated);
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.shopTheme() });
    } catch {}

    try {
      const docRef = doc(db, 'site_settings', 'theme_shop');
      await setDoc(docRef, sanitizeForFirestore(updated), { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'site_settings/theme_shop', false);
    }
  }

  public async savePagesTheme(settings: PagesThemeSettings): Promise<void> {
    const updated: PagesThemeSettings = mergePagesTheme({
      ...settings,
      updatedAt: new Date().toISOString()
    });
    this.currentPagesTheme = updated;
    localStorage.setItem(PAGES_STORAGE_KEY, JSON.stringify(updated));
    this.notifyPagesListeners();
    try {
      queryClient.setQueryData(queryKeys.settings.pagesTheme(), updated);
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.pagesTheme() });
    } catch {}

    try {
      const docRef = doc(db, 'site_settings', 'theme_pages');
      await setDoc(docRef, sanitizeForFirestore(updated), { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'site_settings/theme_pages', false);
    }
  }

  public async resetToDefault(): Promise<void> {
    await this.saveHomeTheme(DEFAULT_HOME_THEME);
  }

  public async resetGlobalToDefault(): Promise<void> {
    await this.saveGlobalTheme(DEFAULT_GLOBAL_THEME);
  }

  public async resetShopToDefault(): Promise<void> {
    await this.saveShopTheme(DEFAULT_SHOP_THEME);
  }

  public async resetPagesToDefault(): Promise<void> {
    await this.savePagesTheme(DEFAULT_PAGES_THEME);
  }

  public async resetSinglePageToDefault(pageKey: PageThemeKey): Promise<void> {
    const next: PagesThemeSettings = {
      ...this.currentPagesTheme,
      [pageKey]: DEFAULT_PAGES_THEME[pageKey]
    };
    await this.savePagesTheme(next);
  }

  public subscribe(listener: (theme: HomeThemeSettings) => void): () => void {
    this.listeners.push(listener);
    listener(this.currentTheme);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  public subscribeGlobal(listener: (globalTheme: GlobalThemeSettings) => void): () => void {
    this.globalListeners.push(listener);
    listener(this.currentGlobalTheme);
    return () => {
      this.globalListeners = this.globalListeners.filter((l) => l !== listener);
    };
  }

  public subscribeShop(listener: (shopTheme: ShopThemeSettings) => void): () => void {
    this.shopListeners.push(listener);
    listener(this.currentShopTheme);
    return () => {
      this.shopListeners = this.shopListeners.filter((l) => l !== listener);
    };
  }

  public subscribePages(listener: (pagesTheme: PagesThemeSettings) => void): () => void {
    this.pagesListeners.push(listener);
    listener(this.currentPagesTheme);
    return () => {
      this.pagesListeners = this.pagesListeners.filter((l) => l !== listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach((l) => l(this.currentTheme));
  }

  private notifyGlobalListeners() {
    this.globalListeners.forEach((l) => l(this.currentGlobalTheme));
  }

  private notifyShopListeners() {
    this.shopListeners.forEach((l) => l(this.currentShopTheme));
  }

  private notifyPagesListeners() {
    this.pagesListeners.forEach((l) => l(this.currentPagesTheme));
  }
}

export const themeService = new ThemeService();

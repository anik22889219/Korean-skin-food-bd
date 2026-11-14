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
      { id: 'st-guides', label: 'Skincare Routine Guides', to: '/guides', enabled: true },
      { id: 'st-reviews', label: 'Google Reviews (4.9 ★)', to: 'https://share.google/lEQv5trQv88b0w8WT', enabled: true, isExternal: true, highlight: true },
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
      { id: 'lg-about', label: 'About Our Story', to: '/about-us', enabled: true },
      { id: 'lg-contact', label: 'Contact & Help Desk', to: '/contact-us', enabled: true },
      { id: 'lg-privacy', label: 'Privacy Policy', to: '/privacy-policy', enabled: true },
      { id: 'lg-terms', label: 'Terms of Service', to: '/terms-of-service', enabled: true },
    ]
  }
};

export const DEFAULT_GLOBAL_THEME: GlobalThemeSettings = {
  faviconUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDV9JqR2f8TTBJG32wqldTxeJQRLC1xolU3UBXhjlG8xqiFFHmPa8s7VOmDWPNYjyf-t6OqEzaveZ7B4b0qSnfSfsjMLerSO2S0r_L5h7hWtHIb0PQcNOU9xzM5hr44aKCbKYO0mcXsLe818N0R-AA3Zj14exAmZCen73zfHV8MVDMbR9l4MQjyLLTF_Ar2OIbFnMMc-hSVV4yFDshte5KzLe5iLA2SY-A8gSFkM3MlXUpPyZu37-bDXliWJF5e0ujz-d6-bUCf01w',
  logoUrl: '',
  logoText: 'Korean Skin Food BD',
  logoTagline: 'K-BEAUTY COSMECEUTICALS',
  primaryColor: '#E91E8C',
  secondaryColor: '#FF62B2',
  accentColor: '#0F172A',
  backgroundColor: '#FFF5F8',
  headingFont: 'Hind Siliguri',
  bodyFont: 'Open Sans',
  siteTitle: 'Korean Skin Food BD',
  siteTagline: '100% Authentic Korean Cosmeceuticals straight from Seoul',
  contactPhone: '+880 1700-000000',
  contactEmail: 'koreanskinfood.bd@gmail.com',
  contactAddress: 'Banani Road 11, Dhaka, Bangladesh',
  currencySymbol: '৳',
  facebookUrl: 'https://www.facebook.com/Koreanskinfood',
  instagramUrl: 'https://www.instagram.com/korean_skin_food_2579/',
  youtubeUrl: 'https://youtube.com',
  messengerUrl: 'https://m.me/651561268050601',
  announcementText: '✨ FREE shipping inside Dhaka for orders over ৳2,000! ✨',
  enableAnnouncement: true,
  footerText: 'Korean Skin Food BD © 2026. All rights reserved. Premium Korean Cosmeceuticals.',
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
    badgeText: 'List in Your Store',
    titleLine1: 'Import Products',
    titleHighlight: 'List in Your Store',
    titleLine2: 'Ship Globally',
    subtitle: 'The ultimate dropshipping bridge between Korean botanical wisdom and global markets. Seamless integration, premium fulfillment.',
    primaryButtonText: 'Get Started Free',
    primaryButtonLink: '/shop',
    secondaryButtonText: 'Learn More',
    secondaryButtonLink: '/about-us',
    backgroundImageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDV9JqR2f8TTBJG32wqldTxeJQRLC1xolU3UBXhjlG8xqiFFHmPa8s7VOmDWPNYjyf-t6OqEzaveZ7B4b0qSnfSfsjMLerSO2S0r_L5h7hWtHIb0PQcNOU9xzM5hr44aKCbKYO0mcXsLe818N0R-AA3Zj14exAmZCen73zfHV8MVDMbR9l4MQjyLLTF_Ar2OIbFnMMc-hSVV4yFDshte5KzLe5iLA2SY-A8gSFkM3MlXUpPyZu37-bDXliWJF5e0ujz-d6-bUCf01w',
    showShippingCalculator: true,
    calculatorTitle: 'Shipping Calculator',
    shipFrom: 'China',
    shipTo: 'Bangladesh',
    cargoName: 'AB EXPRESS CARGO',
    cargoBadge: 'Recommended',
    weightLabel: 'Weight (kg)',
    weightPlaceholder: 'Enter weight',
    calculateButtonText: 'Calculate Your Shipping Cost',
    rateNote: 'Direct Cargo Real-time Rates'
  },
  featureIcons: {
    enabled: true,
    items: [
      {
        id: 'feat-1',
        enabled: true,
        iconName: 'language',
        title: 'Sourcing from Any Platforms',
        bgColor: 'bg-pink-50',
        iconColor: 'text-pink-500'
      },
      {
        id: 'feat-2',
        enabled: true,
        iconName: 'storefront',
        title: 'Multiple Store Listing',
        bgColor: 'bg-purple-50',
        iconColor: 'text-purple-600'
      },
      {
        id: 'feat-3',
        enabled: true,
        iconName: 'speed',
        title: 'Fast & Secure Shipping',
        bgColor: 'bg-blue-50',
        iconColor: 'text-blue-400'
      },
      {
        id: 'feat-4',
        enabled: true,
        iconName: 'verified',
        title: 'End-to-End Fulfillment',
        bgColor: 'bg-green-50',
        iconColor: 'text-green-500'
      },
      {
        id: 'feat-5',
        enabled: true,
        iconName: 'request_quote',
        title: 'Request for Sourcing',
        bgColor: 'bg-orange-50',
        iconColor: 'text-orange-500'
      }
    ]
  },
  founderStory: {
    enabled: true,
    subtitle: "OUR FOUNDERS' STORY",
    title: 'A Legacy of Love & Light',
    quote: '"We didn\'t just want to create another skincare brand. We wanted to build a bridge—a way to share the timeless wisdom of Korean botanical traditions with a modern world seeking authenticity."',
    body: 'Born from a shared passion for pure ingredients and rigorous standards, Korean Skin Food began as a small initiative to bring high-potency, ethically sourced heritage ingredients to global markets.',
    estYear: 'Est. 2014',
    founderImageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBOzj3L4E3LOsKUDd0DevhbePBhoN3Ar8wYAQm_f5w6DkiNR5L2FUJvU6W-27PQtA2rOxk-v1sV4q3HMHdQGm-j3ilMcval8tFJTyxwscNNsucABHWJbNLEzSdKS2ILYoBSJlaVLJN2SbyIQVdX1bhfh3woUNckwmO8_j8Vn8NdShxGN28-fwVhO2Kko2WnVffR4ROmOGKrLWwk6e-AFvApBzdGE2fX_bcr_xzL7eB6MfDEIHP-LPaeIGxPa89Hq4dqPpC0B7S95Mw',
    councilLabel: 'THE HERITAGE COUNCIL'
  },
  botanicalEssentials: {
    enabled: true,
    subtitle: 'HERITAGE FAVORITES',
    title: 'Botanical Essentials',
    buttonText: 'Add to Bag',
    selectedProductIds: []
  },
  qualityAssurance: {
    enabled: true,
    subtitle: 'QUALITY ASSURANCE',
    title: 'A Global Standard of Integrity',
    description: 'Beyond formulation, we control every step of the journey. From our certified sorting facilities to climate-controlled transit, we ensure botanical integrity remains uncompromised.',
    features: [
      {
        id: 'qa-1',
        numberStr: '01',
        title: 'INVENTORY PRECISION',
        desc: 'Our warehouse operations utilize rigorous batch tracking to guarantee freshness.'
      },
      {
        id: 'qa-2',
        numberStr: '02',
        title: 'DIRECT LOGISTICS',
        desc: 'Proprietary cargo solutions eliminate third-party handling, preserving sanctuary ingredients.'
      }
    ],
    mainImageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDH2LoWWo-SbNTwCqrFgUFpyUtVIC9bOI4Zrj135WguZql4fmOPsK8prr_BbxhLktvvOYy1p5wcEO-eTQ9gubPk5aAVaAjigFYYRbHd3YWd6mJcuyDCq8xe5nPFfIV8ss6_O9l7aGuEyE31MHKopI2hkkbjfu_ZryYj0sTdLmwoWVkbRkUEdUQue37h2ArOZx_BhXszbrBVFJh_upJcr__mTcIGmbqDPZ8ulsEwInSslEAURYbPnhcJzD3WRyfortj_I1smJazHTV8',
    opsNoteTitle: 'Operations Note',
    opsNoteQuote: '"Our reach is global, but our standard is singular. We treat every shipment as a ritual of trust."',
    opsNoteImageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCDoVlcveeL6BbwjoPCSbobXaTJNM7TReLGuvKIDqAww26XR9QQRoxioriDwqJX-rz_iYd6RzLU9fpSkmouWRdPs-RxzDBx9KXq6Gw9RaJClhEdfrjxUnbLcn4Leh86-VBAoMo0HU-cXhstTVHf6u9upQQp-6oLgFYn3DBG5gIM__U_j5Tpv4Ro9OlsdMQal2xN_G9_nR1CxbvMd3ImUogiiXR2czFJYcmFDC5DOVa81SzcVALZk7Ow2iCzsJsc_M3UNRjEUNYhZhA'
  },
  validatedFormulations: {
    enabled: false,
    subtitle: 'PRECISION SCIENCE',
    title: 'Validated Formulations',
    buttonText: 'Shop Now',
    selectedProductIds: []
  },
  sharedJourney: {
    enabled: true,
    subtitle: 'THE PEOPLE BEHIND THE LIGHT',
    title: 'A Shared Journey of Radiance',
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
        hoverText: 'Our Core Team'
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
    subtitle: 'REACH & RELIABILITY',
    title: 'Bridging Continents',
    description: 'From meticulous operations hubs in South Korea to specialized regional offices, we ensure botanical potency is preserved. Transparency is clear as the light we promote.',
    stats: [
      {
        id: 'stat-1',
        label: 'TRANSIT',
        value: 'Secure',
        subValue: 'Direct Channels'
      },
      {
        id: 'stat-2',
        label: 'INTEGRITY',
        value: '100%',
        subValue: 'Verified Origins'
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
    heroBadge: 'The Ritual of Light',
    heroTitleLine1: 'Authentic Beauty.',
    heroTitleHighlight: 'Validated Roots.',
    heroSubtitle: "Bridging Seoul's timeless botanical wisdom with Bangladesh's distinct skin rituals through direct manufacturer provenance and certified laboratory integrity.",
    heroPrimaryBtnText: 'Discover Our Heritage',
    heroSecondaryBtnText: 'Explore Catalog',
    heroSecondaryBtnLink: '/shop',
    heroImageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDygV0BUx3FRHwpnDvTSsMsiG1TsjcGBgKWE8vEsaUi5TRYTM-pzc4wgYwMs1-n-Zhv04YeC1al6FBGnOFf_6_JQacp8mUx8Ulk8cq0QFnA00nmiBUQLfC9i-UHYH8n1G4DJHoiA_X068q3nfC_i0QcK_uvJUfOM9DwxqtR7yczoZ1zTqwlvm5NeEUFPH0wHNqWT_LD9F3Xhgc2VREFAublAEJzOmy0z83LwvQ2vyOXHKxK4YZ77Q_Me3PJ_GIUl8BRSicxciMdpqM',
    showFoundersStory: true,
    foundersSubtitle: "Our Founders' Story",
    foundersTitle: 'A Legacy of Love & Light',
    foundersQuote: '"We didn\'t just want to create another skincare brand. We wanted to build a bridge—a way to share the timeless wisdom of Korean botanical traditions with a modern world seeking authenticity."',
    foundersBody: "Born from a shared passion for pure ingredients and rigorous standards, Korean Skin Food began as a small initiative to bring high-potency, ethically sourced heritage ingredients to global markets. Today, our founders remain deeply involved in every step of the 'Ritual of Light'.",
    foundersEstYear: 'Est. 2014',
    foundersCouncilLabel: 'The Heritage Council',
    foundersImageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBOzj3L4E3LOsKUDd0DevhbePBhoN3Ar8wYAQm_f5w6DkiNR5L2FUJvU6W-27PQtA2rOxk-v1sV4q3HMHdQGm-j3ilMcval8tFJTyxwscNNsucABHWJbNLEzSdKS2ILYoBSJlaVLJN2SbyIQVdX1bhfh3woUNckwmO8_j8Vn8NdShxGN28-fwVhO2Kko2WnVffR4ROmOGKrLWwk6e-AFvApBzdGE2fX_bcr_xzL7eB6MfDEIHP-LPaeIGxPa89Hq4dqPpC0B7S95Mw',
    showHeritageEssentials: true,
    heritageSubtitle: 'Heritage Favorites',
    heritageTitle: 'Botanical Essentials',
    showQualityAssurance: true,
    qaSubtitle: 'Quality Assurance',
    qaTitle: 'A Global Standard of Integrity',
    qaDescription: 'Beyond formulation, we control every step of the journey. From our certified sorting facilities to climate-controlled transit, we ensure the botanical integrity of our products remains uncompromised from Korea to the world.',
    qaMainImageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDH2LoWWo-SbNTwCqrFgUFpyUtVIC9bOI4Zrj135WguZql4fmOPsK8prr_BbxhLktvvOYy1p5wcEO-eTQ9gubPk5aAVaAjigFYYRbHd3YWd6mJcuyDCq8xe5nPFfIV8ss6_O9l7aGuEyE31MHKopI2hkkbjfu_ZryYj0sTdLmwoWVkbRkUEdUQue37h2ArOZx_BhXszbrBVFJh_upJcr__mTcIGmbqDPZ8ulsEwInSslEAURYbPnhcJzD3WRyfortj_I1smJazHTV8',
    qaNoteTitle: 'Operations Note',
    qaNoteQuote: '"Our reach is global, but our standard is singular. We treat every shipment as a ritual of trust."',
    qaNoteImageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCDoVlcveeL6BbwjoPCSbobXaTJNM7TReLGuvKIDqAww26XR9QQRoxioriDwqJX-rz_iYd6RzLU9fpSkmouWRdPs-RxzDBx9KXq6Gw9RaJClhEdfrjxUnbLcn4Leh86-VBAoMo0HU-cXhstTVHf6u9upQQp-6oLgFYn3DBG5gIM__U_j5Tpv4Ro9OlsdMQal2xN_G9_nR1CxbvMd3ImUogiiXR2czFJYcmFDC5DOVa81SzcVALZk7Ow2iCzsJsc_M3UNRjEUNYhZhA',
    showValidatedScience: true,
    validatedSubtitle: 'Precision Science',
    validatedTitle: 'Validated Formulations',
    validatedDescription: 'Scientifically proven botanicals tested across environmental gradients for lasting barrier vitality.',
    showHumanConnection: true,
    humanSubtitle: 'The Human Connection',
    humanTitle: 'Built on Enduring Partnerships',
    humanQuote: '"KOREAN SKIN FOOD is more than a beauty brand; it\'s a bridge between cultures. Our commitment to authentic sourcing and transparent operations is what defines our legacy in the global market."',
    humanAttribution: '— STRATEGIC LEADERSHIP TEAM',
    humanImageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDgTQaRbZixVhXln6so0dlGREA6GdOxL6yXvgemYepAqppVLtsFcT0lRhGmgb8mpDma_IiHb7ErIK9YUuAZXa8U9kNLaekLj18qSdqCKTaCfeAVxfPF-05iV1Nu3l90UqgsNet-NpGGNXu5KPSvsedYRNoJRT9k5Stmh0y2DcctzfMcWIo9blVPY-pwRvwpbXnAWL3OLX1kyUSTF6AdswBgZ8Dmczc8DTQh0mhesKKKhqlRUpNG8Vz86KG0i9btEXetVjx8yVx1mUo',
    showPartnershipSelection: true,
    partnershipSubtitle: 'Curated Collaborations',
    partnershipTitle: 'The Partnership Selection',
    showSharedJourney: true,
    sharedJourneySubtitle: 'The People Behind the Light',
    sharedJourneyTitle: 'A Shared Journey of Radiance',
    showReachReliability: true,
    reachSubtitle: 'Reach & Reliability',
    reachTitle: 'Bridging Continents',
    reachDescription: 'From our meticulous operations hubs in South Korea to our specialized regional offices, we ensure every product arrives with its botanical potency fully preserved. We operate with a transparency that is as clear as the light we promote.',
    showBestsellingRituals: true,
    bestsellingSubtitle: 'Global Reach',
    bestsellingTitle: 'Bestselling Rituals',
    bestsellingDescription: 'Beloved by skincare devotees across Seoul, Dhaka, and beyond.',
    showBottomBanner: true,
    bottomBannerSubtitle: 'Direct Guidance',
    bottomBannerTitle: 'Begin Your Custom Skincare Ritual',
    bottomBannerDescription: 'Connect directly with our Seoul-trained specialists to tailor formulas formulated for your climate and barrier profile.',
    bottomPrimaryBtnText: 'Consult an Expert',
    bottomPrimaryBtnLink: '/contact-us',
    bottomSecondaryBtnText: 'Explore Full Collection',
    bottomSecondaryBtnLink: '/shop',
  },
  contact: {
    badgeText: 'Get In Touch',
    title: 'Contact Our Skincare Desk',
    subtitle: 'Have questions about a product, shipping, or need professional advice? Drop us a line below or reach out directly through WhatsApp.',
    channelsHeading: 'Direct Support Channels',
    whatsappLabel: 'WhatsApp Live Chat',
    whatsappNumber: '+880 1755-837545',
    emailLabel: 'Email Assistance',
    emailAddress: 'koreanskinfood.bd@gmail.com',
    locationLabel: 'Skincare Hub Location',
    locationAddress: 'Banani Road 11, Dhaka, Bangladesh',
    showPromiseBox: true,
    promiseHeading: 'Our Customer Promise',
    promises: [
      '100% Genuine, Seoul-sourced imports only',
      'Strict batch-by-batch expiration quality checks',
      'Safe cash on delivery with open package check',
    ],
    showInquiryForm: true,
    formHeading: 'Skincare Consultation Inquiry',
    formSubtitle: 'Provide details about your concerns for customized recommendations.',
    formSubmitButtonText: 'Send Skincare Inquiry',
    successHeading: 'Inquiry Received Safely!',
    successMessage: 'Our expert skincare counselor will review your skin parameters and get in touch with you shortly.',
    showFaqs: true,
    faqHeading: 'Frequently Asked Questions',
    faqSubtitle: 'Quick answers regarding shopping, shipping policy, and authentic cosmetics.',
    faqs: [
      {
        id: 'c-faq-1',
        question: 'Are your Korean products 100% genuine and authentic?',
        answer: 'Absolutely! We pride ourselves on sourcing products directly from licensed beauty manufacturers in South Korea (Seoul). Every product is complete with manufacturer seal codes, and we back them with a 100% full money-back authenticity guarantee.',
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
    authenticityCardTitle: '100% Genuine Imported Skincare',
    authenticityCardBody: 'Directly imported from licensed Korean cosmeceutical laboratories in Seoul. Every bottle is authenticated with genuine batch barcodes and manufacturer seals.',
    showShippingRates: true,
    insideDhakaRate: '৳80 COD',
    outsideDhakaRate: '৳150 COD',
    freeShippingThreshold: 'Above ৳2,000',
    sections: [
      {
        id: 'authenticity',
        title: '1. 100% Genuine Import Guarantee',
        body: 'Korean Skin Food Bangladesh guarantees that every single product listed on our store is 100% genuine and sourced directly from licensed cosmetic laboratories and authorized brand channels in Seoul, South Korea. If any product is ever verified counterfeit by authorized analysis, we provide a 100% instant refund.',
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
        body: 'Because skincare formulations are personal hygiene products, notify us within 48 hours of receipt with photo/video evidence for damaged or incorrect items. Unsealed, opened, or swatched products are non-returnable unless proven defective by manufacturer batch. Approved refunds settle within 5 to 7 business days.',
      },
      {
        id: 'skincare-disclaimer',
        title: '5. Skincare Advice & Disclaimer',
        body: 'Skincare recommendations from our advisors or AI assistant are for cosmetic education only. Individual skin biology varies—always perform a 24-hour patch test prior to full facial application of active ingredients such as Vitamin C, AHA/BHA, or Retinoids.',
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
    heroSubtitle: "Join Korean Skin Food BD's exclusive Creator Program. Create authentic Facebook & Instagram reels, earn verified engagement points, climb the live leaderboard, and get free imported cosmeceuticals straight from Seoul.",
    primaryCtaText: 'Apply to Become a Creator',
    secondaryCtaText: 'View Live Leaderboard',
    secondaryCtaLink: '/creator/leaderboard',
    showStats: true,
    stats: [
      { id: 'cs-1', value: '100%', label: 'Seoul Genuine' },
      { id: 'cs-2', value: '6 Tiers', label: 'Progressive Levels' },
      { id: 'cs-3', value: 'Free PR', label: 'Product Hampers' },
      { id: 'cs-4', value: 'Cash & Perks', label: 'Monetization' },
    ],
    showPerks: true,
    perksEyebrow: 'Why Join Our Creator Squad',
    perksTitle: 'Everything You Need to Grow & Shine',
    perks: [
      { id: 'cp-1', title: 'Authentic Seoul PR Boxes', desc: 'Receive 100% genuine imported Korean skincare products delivered straight to your door across Bangladesh.' },
      { id: 'cp-2', title: 'Points on Views & Likes', desc: 'Every Facebook Reel you share generates points based on verified views, likes, and comments.' },
      { id: 'cp-3', title: '6-Tier Level Progression', desc: 'Advance from Novice to Glow Ambassador to unlock discounts, PR hampers, and paid sponsorships.' },
      { id: 'cp-4', title: 'Live Public Leaderboard', desc: 'Get showcased on our store leaderboard, grow your audience, and build beauty authority.' },
      { id: 'cp-5', title: 'Home Store Showcase', desc: 'Top performing reels appear in our Community Live carousel seen by thousands of shoppers daily.' },
      { id: 'cp-6', title: 'VIP Creator WhatsApp Group', desc: 'Connect with K-Beauty specialists, get formulation notes, and receive early Seoul arrival alerts.' },
    ],
    showSteps: true,
    stepsEyebrow: 'Easy 4-Step Process',
    stepsTitle: 'How to Become an Official Creator',
    steps: [
      { id: 'st-1', title: 'Apply with Your Profile', desc: 'Fill out the quick creator registration form below with your handle, phone, and skincare niche.' },
      { id: 'st-2', title: 'Admin Verification', desc: 'Our team reviews your submission within 24-48 hours and activates your verified Creator Account.' },
      { id: 'st-3', title: 'Create & Post Reels', desc: 'Create engaging Facebook & Instagram reels testing Korean skincare, and submit the link in your dashboard.' },
      { id: 'st-4', title: 'Earn Points & PR Gifts', desc: 'Climb the 6 tiers, level up to Glow Ambassador, claim free PR boxes, and earn cash rewards.' },
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
        question: 'How do I receive free Korean Skincare PR Boxes?',
        answer: 'Approved creators who reach Level 2 (Glow Enthusiast) and above receive complimentary authentic Korean skincare products imported straight from Seoul delivered via courier across Bangladesh.',
      },
      {
        id: 'bc-faq-4',
        question: 'How long does the application approval take?',
        answer: 'Our admin team reviews submissions usually within 24 to 48 hours and sends confirmation via WhatsApp or phone.',
      },
      {
        id: 'bc-faq-5',
        question: 'Is there any fee or cost to join the creator program?',
        answer: 'No! Joining the Korean Skin Food BD Creator Program is 100% free.',
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
    badgeText: '100% Guaranteed South Korean Imports',
    title: 'Korean Skincare Brands in Bangladesh',
    subtitle: "Korean Skin Food BD is Bangladesh's dedicated sanctuary for genuine Korean beauty. Browse our authenticated brand partners imported straight from Seoul with manufacturer batch transparency.",
    searchPlaceholder: 'Search Korean brand (e.g. COSRX, SKIN1004, Anua)...',
    showFeaturedSection: true,
    featuredTitle: 'Featured K-Beauty Flagships',
    featuredCtaLabel: 'Explore Brand Catalog',
    showDirectorySection: true,
    directoryTitle: 'Complete Brand Directory',
  },
  brandLanding: {
    authenticityBadge: '100% Authentic Korean Import',
    defaultHeroImage: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=1200&q=80',
    catalogHeadingPrefix: 'Available Products',
    catalogSubtext: 'Genuine Seoul-imported formulas with cash on delivery across Bangladesh.',
    emptyStateTitle: 'New Shipments Arriving Soon',
    emptyStateCtaLabel: 'Browse All Korean Skincare',
    emptyStateCtaLink: '/shop',
    showSignatureIngredients: true,
    showFaqs: true,
    faqHeadingPrefix: 'Frequently Asked Questions',
    faqSubtext: 'Key guidance on authenticity verification, suitable skin types, and delivery terms.',
  },
  guidesIndex: {
    badgeText: 'K-Beauty Educational Knowledge Base',
    titleEN: 'Korean Skincare Guides for Bangladesh',
    titleBN: 'বাংলাদেশে কোরিয়ান স্কিন কেয়ার সহায়িকা',
    subtitleEN: 'Evidence-conscious, climate-tailored advice on building healthy skincare routines, decoding active ingredients, and choosing authentic Seoul-imported cosmetics.',
    subtitleBN: 'আমাদের আবহাওয়ার সাথে মানানসই কোরিয়ান রূপচর্চার বিজ্ঞানসম্মত দিকনির্দেশনা ও আসল প্রডাক্ট চেনার সঠিক উপায়।',
    readGuideLabelEN: 'Read Complete Guide',
    readGuideLabelBN: 'সম্পূর্ণ গাইড পড়ুন',
    showLanguageSwitcher: true,
    showCategoryTabs: true,
  },
  guideDetail: {
    showLanguageSwitcher: true,
    featuredActivesHeading: 'Featured Dermatological Actives Discussed',
    showFaqs: true,
    faqHeadingEN: 'Frequently Asked Questions',
    faqHeadingBN: 'সাধারণ জিজ্ঞাসা (FAQ)',
    faqSubtext: 'Clear answers to common questions about this skincare topic in Bangladesh.',
    showRelatedProducts: true,
    relatedHeading: 'Recommended Products from Our Catalog',
    relatedSubtext: 'Authentic, Seoul-imported cosmeceuticals matching the principles outlined in this guide.',
    relatedCtaLabel: 'View All Products →',
  },
  productDetail: {
    trustBadge1: '100% Authentic Import',
    trustBadge2: '7-Day Refund Guard',
    showSocialShareBox: true,
    shareBoxTitle: 'Share This Product',
    shareBoxSubtitle: 'Spread the authentic K-Beauty glow',
    addToBasketLabel: 'Add to Skincare Basket',
    wholesaleCtaLabel: 'Order Wholesale & Proceed to Checkout',
    whatsappCtaLabel: 'Order via WhatsApp',
    showReviewsSection: true,
    reviewsHeading: 'Customer Reviews & Photos',
    showRelatedSection: true,
    relatedHeading: 'Discover More K-Beauty',
    relatedSubtext: 'Handpicked related skin nourishment formulations.',
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

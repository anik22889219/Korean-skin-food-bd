import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { HomeThemeSettings } from '../types/theme';

export const DEFAULT_HOME_THEME: HomeThemeSettings = {
  sectionOrder: [
    'hero',
    'featureIcons',
    'founderStory',
    'botanicalEssentials',
    'qualityAssurance',
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
        title: 'Korean Skincare Routine & Beauty Secrets',
        coverUrl: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600&auto=format&fit=crop&q=60',
        videoUrl: 'https://www.facebook.com/share/r/1Epn8LCGMT/',
        createdAt: '2026-07-20',
        viewsCount: 2450,
        likesCount: 380,
        sharesCount: 64
      },
      {
        id: 'reel-2',
        title: 'Glass Skin Glow & Authentic K-Beauty Unboxing',
        coverUrl: 'https://images.unsplash.com/photo-1616683693504-3ea7e9ad6fec?w=600&auto=format&fit=crop&q=60',
        videoUrl: 'https://www.facebook.com/share/r/1DHQbuWo9Y/',
        createdAt: '2026-07-15',
        viewsCount: 4120,
        likesCount: 590,
        sharesCount: 112
      },
      {
        id: 'reel-3',
        title: 'Daily Hydration & Botanical Care Highlights',
        coverUrl: 'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=600&auto=format&fit=crop&q=60',
        videoUrl: 'https://www.facebook.com/share/r/18oiK3D2Vd/',
        createdAt: '2026-07-08',
        viewsCount: 1890,
        likesCount: 210,
        sharesCount: 38
      }
    ]
  }
};

const STORAGE_KEY = 'ksf_home_theme_settings';

class ThemeService {
  private currentTheme: HomeThemeSettings = DEFAULT_HOME_THEME;
  private listeners: ((theme: HomeThemeSettings) => void)[] = [];

  constructor() {
    this.init();
  }

  private sanitizeTheme(theme: HomeThemeSettings): HomeThemeSettings {
    const defaultReels = DEFAULT_HOME_THEME.communityLive.reels;
    const currentReels = theme.communityLive?.reels || defaultReels;
    
    // Replace generic placeholder links with real Facebook Reel links if present
    const updatedReels = currentReels.map((reel, idx) => {
      if (!reel.videoUrl || reel.videoUrl === 'https://facebook.com' || reel.videoUrl === '#') {
        return defaultReels[idx] || reel;
      }
      return reel;
    });

    return {
      ...theme,
      sectionOrder: (theme.sectionOrder || DEFAULT_HOME_THEME.sectionOrder).filter(s => s !== 'validatedFormulations'),
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
    // 1. Try loading cached local theme
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        this.currentTheme = this.sanitizeTheme({ ...DEFAULT_HOME_THEME, ...JSON.parse(cached) });
      } else {
        this.currentTheme = this.sanitizeTheme(DEFAULT_HOME_THEME);
      }
    } catch (err) {
      console.warn('[ThemeService] LocalStorage load error:', err);
    }

    // 2. Subscribe to Firestore real-time updates for site_settings/theme_home
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
          }
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, 'site_settings/theme_home', false);
        }
      );
    } catch (err) {
      console.warn('[ThemeService] Firestore listener init warning:', err);
    }
  }

  public getHomeTheme(): HomeThemeSettings {
    return this.currentTheme;
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
      const docRef = doc(db, 'site_settings', 'theme_home');
      await setDoc(docRef, updated, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'site_settings/theme_home', false);
    }
  }

  public async resetToDefault(): Promise<void> {
    await this.saveHomeTheme(DEFAULT_HOME_THEME);
  }

  public subscribe(listener: (theme: HomeThemeSettings) => void): () => void {
    this.listeners.push(listener);
    listener(this.currentTheme);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach((l) => l(this.currentTheme));
  }
}

export const themeService = new ThemeService();

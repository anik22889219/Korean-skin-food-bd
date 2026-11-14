export interface HeroSection {
  enabled: boolean;
  badgeText: string;
  titleLine1: string;
  titleHighlight: string;
  titleLine2: string;
  subtitle: string;
  primaryButtonText: string;
  primaryButtonLink: string;
  secondaryButtonText: string;
  secondaryButtonLink: string;
  backgroundImageUrl: string;
  // Shipping calculator card
  showShippingCalculator: boolean;
  calculatorTitle: string;
  shipFrom: string;
  shipTo: string;
  cargoName: string;
  cargoBadge: string;
  weightLabel: string;
  weightPlaceholder: string;
  calculateButtonText: string;
  rateNote: string;
}

export interface FeatureIconItem {
  id: string;
  enabled: boolean;
  iconName: string; // e.g. 'language', 'storefront', 'speed', 'verified', 'request_quote'
  title: string;
  bgColor: string; // e.g. 'bg-pink-50', 'bg-purple-50'
  iconColor: string; // e.g. 'text-pink-500', 'text-purple-600'
}

export interface FeatureIconsSection {
  enabled: boolean;
  items: FeatureIconItem[];
}

export interface FounderStorySection {
  enabled: boolean;
  subtitle: string;
  title: string;
  quote: string;
  body: string;
  estYear: string;
  founderImageUrl: string;
  councilLabel: string;
}

export interface BotanicalEssentialsSection {
  enabled: boolean;
  subtitle: string;
  title: string;
  buttonText: string;
  selectedProductIds: string[]; // empty means auto-select
}

export interface QualityAssuranceFeature {
  id: string;
  numberStr: string; // e.g. "01"
  title: string;
  desc: string;
}

export interface QualityAssuranceSection {
  enabled: boolean;
  subtitle: string;
  title: string;
  description: string;
  features: QualityAssuranceFeature[];
  mainImageUrl: string;
  opsNoteTitle: string;
  opsNoteQuote: string;
  opsNoteImageUrl: string;
}

export interface ValidatedFormulationsSection {
  enabled: boolean;
  subtitle: string;
  title: string;
  buttonText: string;
  selectedProductIds: string[]; // empty means auto-select
}

export interface CommunityPhotoItem {
  id: string;
  imageUrl: string;
  altText: string;
  hoverText?: string;
}

export interface SharedJourneySection {
  enabled: boolean;
  subtitle: string;
  title: string;
  photos: CommunityPhotoItem[];
}

export interface StatItem {
  id: string;
  label: string;
  value: string;
  subValue: string;
}

export interface ReachReliabilitySection {
  enabled: boolean;
  subtitle: string;
  title: string;
  description: string;
  stats: StatItem[];
  image1Url: string;
  image2Url: string;
  image3Url: string;
}

export interface ReelItem {
  id: string;
  title: string;
  coverUrl: string;
  videoUrl: string;
  postUrl?: string;
  createdAt?: string;
  viewsCount?: number;
  likesCount?: number;
  sharesCount?: number;
}

export interface CommunityLiveSection {
  enabled: boolean;
  subtitle: string;
  title: string;
  reelsSectionTitle: string;
  viewAllLinkText: string;
  viewAllLinkUrl: string;
  reels: ReelItem[];
}

export interface GoogleReviewsSection {
  enabled: boolean;
  subtitle: string;
  title: string;
  shareUrl: string;
  writeReviewUrl: string;
  showBreakdown: boolean;
  maxReviews: number;
  customReviews?: Array<{
    id: string;
    authorName: string;
    authorPhotoUrl?: string;
    rating: number;
    relativeTimeDescription?: string;
    text: string;
    productPurchased?: string;
    isVerifiedCustomer?: boolean;
    isLocalGuide?: boolean;
    replyText?: string;
    likesCount?: number;
  }>;
  customRating?: number;
  customTotalReviews?: number;
  customRatingBreakdown?: {
    fiveStar?: number;
    fourStar?: number;
    threeStar?: number;
    twoStar?: number;
    oneStar?: number;
  };
}

export type SectionKey =
  | 'hero'
  | 'featureIcons'
  | 'founderStory'
  | 'botanicalEssentials'
  | 'qualityAssurance'
  | 'googleReviews'
  | 'validatedFormulations'
  | 'sharedJourney'
  | 'reachReliability'
  | 'communityLive';

export interface FooterLinkItem {
  id: string;
  label: string;
  to: string;
  enabled: boolean;
  isExternal?: boolean;
  highlight?: boolean;
}

export interface FooterColumnGroup {
  title: string;
  links: FooterLinkItem[];
}

export interface FooterColumnsSettings {
  store: FooterColumnGroup;
  partners: FooterColumnGroup;
  legal: FooterColumnGroup;
}

export interface GlobalThemeSettings {
  faviconUrl: string;
  logoUrl: string;
  logoText: string;
  logoTagline: string;
  primaryColor: string; // e.g. '#E91E8C'
  secondaryColor: string; // e.g. '#FF62B2'
  accentColor: string; // e.g. '#0F172A'
  backgroundColor: string; // e.g. '#FFF5F8'
  headingFont: string; // e.g. 'Playfair Display'
  bodyFont: string; // e.g. 'Plus Jakarta Sans'
  siteTitle: string;
  siteTagline: string;
  contactPhone: string;
  contactEmail: string;
  contactAddress?: string;
  currencySymbol: string;
  facebookUrl: string;
  instagramUrl: string;
  youtubeUrl: string;
  messengerUrl: string;
  announcementText: string;
  enableAnnouncement: boolean;
  footerText: string;
  footerColumns?: FooterColumnsSettings;
  updatedAt?: string;
}

export interface HomeThemeSettings {
  sectionOrder: SectionKey[];
  hero: HeroSection;
  featureIcons: FeatureIconsSection;
  founderStory: FounderStorySection;
  botanicalEssentials: BotanicalEssentialsSection;
  qualityAssurance: QualityAssuranceSection;
  googleReviews: GoogleReviewsSection;
  validatedFormulations: ValidatedFormulationsSection;
  sharedJourney: SharedJourneySection;
  reachReliability: ReachReliabilitySection;
  communityLive: CommunityLiveSection;
  updatedAt?: string;
}

export interface ShopThemeSettings {
  heroTitle: string;
  heroSubtitle: string;
  heroBannerUrl: string;
  quoteText: string;
  quoteAuthor: string;
  itemsPerPage: number;
  defaultSort: string;
  updatedAt?: string;
}

export type PageThemeKey =
  | 'about'
  | 'contact'
  | 'privacy'
  | 'terms'
  | 'becomeCreator'
  | 'brandsIndex'
  | 'brandLanding'
  | 'guidesIndex'
  | 'guideDetail'
  | 'productDetail'
  | 'login'
  | 'notFound';

export interface FaqEntry {
  id: string;
  question: string;
  answer: string;
}

export interface LegalArticleSection {
  id: string;
  title: string;
  body: string;
  bullets?: string[];
}

export interface AboutPageThemeSettings {
  showHero: boolean;
  heroBadge: string;
  heroTitleLine1: string;
  heroTitleHighlight: string;
  heroSubtitle: string;
  heroPrimaryBtnText: string;
  heroSecondaryBtnText: string;
  heroSecondaryBtnLink: string;
  heroImageUrl: string;
  showFoundersStory: boolean;
  foundersSubtitle: string;
  foundersTitle: string;
  foundersQuote: string;
  foundersBody: string;
  foundersEstYear: string;
  foundersCouncilLabel: string;
  foundersImageUrl: string;
  showHeritageEssentials: boolean;
  heritageSubtitle: string;
  heritageTitle: string;
  showQualityAssurance: boolean;
  qaSubtitle: string;
  qaTitle: string;
  qaDescription: string;
  qaMainImageUrl: string;
  qaNoteTitle: string;
  qaNoteQuote: string;
  qaNoteImageUrl: string;
  showValidatedScience: boolean;
  validatedSubtitle: string;
  validatedTitle: string;
  validatedDescription: string;
  showHumanConnection: boolean;
  humanSubtitle: string;
  humanTitle: string;
  humanQuote: string;
  humanAttribution: string;
  humanImageUrl: string;
  showPartnershipSelection: boolean;
  partnershipSubtitle: string;
  partnershipTitle: string;
  showSharedJourney: boolean;
  sharedJourneySubtitle: string;
  sharedJourneyTitle: string;
  showReachReliability: boolean;
  reachSubtitle: string;
  reachTitle: string;
  reachDescription: string;
  showBestsellingRituals: boolean;
  bestsellingSubtitle: string;
  bestsellingTitle: string;
  bestsellingDescription: string;
  showBottomBanner: boolean;
  bottomBannerSubtitle: string;
  bottomBannerTitle: string;
  bottomBannerDescription: string;
  bottomPrimaryBtnText: string;
  bottomPrimaryBtnLink: string;
  bottomSecondaryBtnText: string;
  bottomSecondaryBtnLink: string;
}

export interface ContactPageThemeSettings {
  badgeText: string;
  title: string;
  subtitle: string;
  channelsHeading: string;
  whatsappLabel: string;
  whatsappNumber: string;
  emailLabel: string;
  emailAddress: string;
  locationLabel: string;
  locationAddress: string;
  showPromiseBox: boolean;
  promiseHeading: string;
  promises: string[];
  showInquiryForm: boolean;
  formHeading: string;
  formSubtitle: string;
  formSubmitButtonText: string;
  successHeading: string;
  successMessage: string;
  showFaqs: boolean;
  faqHeading: string;
  faqSubtitle: string;
  faqs: FaqEntry[];
}

export interface PrivacyPageThemeSettings {
  heroBadge: string;
  title: string;
  subtitle: string;
  lastUpdatedLabel: string;
  appliesToLabel: string;
  showGuaranteeBox: boolean;
  guaranteeTitle: string;
  guaranteeBody: string;
  sections: LegalArticleSection[];
  contactEmail: string;
  contactPhone: string;
  contactAddress: string;
  showFooterNav: boolean;
}

export interface TermsPageThemeSettings {
  heroBadge: string;
  title: string;
  subtitle: string;
  effectiveDateLabel: string;
  jurisdictionLabel: string;
  showAuthenticityCard: boolean;
  authenticityCardTitle: string;
  authenticityCardBody: string;
  showShippingRates: boolean;
  insideDhakaRate: string;
  outsideDhakaRate: string;
  freeShippingThreshold: string;
  sections: LegalArticleSection[];
  contactEmail: string;
  contactPhone: string;
  contactAddress: string;
  showFooterNav: boolean;
}

export interface CreatorStepItem {
  id: string;
  title: string;
  desc: string;
}

export interface CreatorPerkItem {
  id: string;
  title: string;
  desc: string;
}

export interface BecomeCreatorPageThemeSettings {
  heroBadge: string;
  heroTitleLine1: string;
  heroTitleHighlight: string;
  heroSubtitle: string;
  primaryCtaText: string;
  secondaryCtaText: string;
  secondaryCtaLink: string;
  showStats: boolean;
  stats: Array<{ id: string; value: string; label: string }>;
  showPerks: boolean;
  perksEyebrow: string;
  perksTitle: string;
  perks: CreatorPerkItem[];
  showSteps: boolean;
  stepsEyebrow: string;
  stepsTitle: string;
  steps: CreatorStepItem[];
  showTiers: boolean;
  tiersEyebrow: string;
  tiersTitle: string;
  tiersSubtitle: string;
  formTitle: string;
  formSubtitle: string;
  showFaqs: boolean;
  faqsEyebrow: string;
  faqsTitle: string;
  faqs: FaqEntry[];
  showBottomBanner: boolean;
  bottomTitle: string;
  bottomSubtitle: string;
  bottomMessengerLabel: string;
  bottomMessengerUrl: string;
  bottomApplyLabel: string;
}

export interface BrandsIndexPageThemeSettings {
  badgeText: string;
  title: string;
  subtitle: string;
  searchPlaceholder: string;
  showFeaturedSection: boolean;
  featuredTitle: string;
  featuredCtaLabel: string;
  showDirectorySection: boolean;
  directoryTitle: string;
}

export interface BrandLandingPageThemeSettings {
  authenticityBadge: string;
  defaultHeroImage: string;
  catalogHeadingPrefix: string;
  catalogSubtext: string;
  emptyStateTitle: string;
  emptyStateCtaLabel: string;
  emptyStateCtaLink: string;
  showSignatureIngredients: boolean;
  showFaqs: boolean;
  faqHeadingPrefix: string;
  faqSubtext: string;
}

export interface GuidesIndexPageThemeSettings {
  badgeText: string;
  titleEN: string;
  titleBN: string;
  subtitleEN: string;
  subtitleBN: string;
  readGuideLabelEN: string;
  readGuideLabelBN: string;
  showLanguageSwitcher: boolean;
  showCategoryTabs: boolean;
}

export interface GuideDetailPageThemeSettings {
  showLanguageSwitcher: boolean;
  featuredActivesHeading: string;
  showFaqs: boolean;
  faqHeadingEN: string;
  faqHeadingBN: string;
  faqSubtext: string;
  showRelatedProducts: boolean;
  relatedHeading: string;
  relatedSubtext: string;
  relatedCtaLabel: string;
}

export interface ProductDetailPageThemeSettings {
  trustBadge1: string;
  trustBadge2: string;
  showSocialShareBox: boolean;
  shareBoxTitle: string;
  shareBoxSubtitle: string;
  addToBasketLabel: string;
  wholesaleCtaLabel: string;
  whatsappCtaLabel: string;
  showReviewsSection: boolean;
  reviewsHeading: string;
  showRelatedSection: boolean;
  relatedHeading: string;
  relatedSubtext: string;
}

export interface LoginPageThemeSettings {
  title: string;
  subtitle: string;
  googleButtonText: string;
  securityBadgeText: string;
  backToShopLabel: string;
  backToShopLink: string;
}

export interface NotFoundPageThemeSettings {
  badgeText: string;
  title: string;
  description: string;
  homeBtnLabel: string;
  shopBtnLabel: string;
  brandsBtnLabel: string;
  guidesBtnLabel: string;
  showQuickLinks: boolean;
}

export interface PagesThemeSettings {
  about: AboutPageThemeSettings;
  contact: ContactPageThemeSettings;
  privacy: PrivacyPageThemeSettings;
  terms: TermsPageThemeSettings;
  becomeCreator: BecomeCreatorPageThemeSettings;
  brandsIndex: BrandsIndexPageThemeSettings;
  brandLanding: BrandLandingPageThemeSettings;
  guidesIndex: GuidesIndexPageThemeSettings;
  guideDetail: GuideDetailPageThemeSettings;
  productDetail: ProductDetailPageThemeSettings;
  login: LoginPageThemeSettings;
  notFound: NotFoundPageThemeSettings;
  updatedAt?: string;
}


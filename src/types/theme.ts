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

export type SectionKey =
  | 'hero'
  | 'featureIcons'
  | 'founderStory'
  | 'botanicalEssentials'
  | 'qualityAssurance'
  | 'validatedFormulations'
  | 'sharedJourney'
  | 'reachReliability'
  | 'communityLive';

export interface HomeThemeSettings {
  sectionOrder: SectionKey[];
  hero: HeroSection;
  featureIcons: FeatureIconsSection;
  founderStory: FounderStorySection;
  botanicalEssentials: BotanicalEssentialsSection;
  qualityAssurance: QualityAssuranceSection;
  validatedFormulations: ValidatedFormulationsSection;
  sharedJourney: SharedJourneySection;
  reachReliability: ReachReliabilitySection;
  communityLive: CommunityLiveSection;
  updatedAt?: string;
}

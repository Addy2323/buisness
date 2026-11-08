export type PaperFinish = "MATTE" | "GLOSS" | "SOFT_TOUCH" | "TEXTURED";
export type CornerStyle = "SQUARE" | "ROUNDED";
export type CardSide = "FRONT" | "BACK";

export type ElementType =
  | "text"
  | "qr"
  | "logo"
  | "photo"
  | "shape"
  | "line"
  | "icon"
  | "monogram";

export type FontFamilyOption =
  | "Playfair Display"
  | "Inter"
  | "Plus Jakarta Sans"
  | "Montserrat"
  | "Cormorant Garamond"
  | "Space Grotesk"
  | "Cinzel"
  | "JetBrains Mono";

export type IconChoice =
  | "phone"
  | "mail"
  | "globe"
  | "map-pin"
  | "instagram"
  | "facebook"
  | "building"
  | "shield"
  | "sparkles"
  | "layers"
  | "award"
  | "compass"
  | "door-window"
  | "glass-frame"
  | "office-partition"
  | "balustrade"
  | "curtain"
  | "gear-building"
  | "smartphone"
  | "phone-solid"
  | "mail-solid";

export interface CanvasElement {
  id: string;
  type: ElementType;
  label: string;
  // Coordinates and dimensions in physical millimeters (mm) relative to trim box (0..widthMm, 0..heightMm)
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
  rotation: number;
  zIndex: number;
  locked?: boolean;
  hidden?: boolean;
  opacity?: number;

  // Text properties
  text?: string;
  bindField?:
    | "companyName"
    | "professionalTitle"
    | "phone"
    | "email"
    | "description"
    | "website"
    | "physicalAddress"
    | "instagram"
    | "facebook"
    | "custom";
  fontFamily?: FontFamilyOption;
  fontSizePt?: number; // Typographic points (1pt = 0.3528mm)
  fontWeight?: "300" | "400" | "500" | "600" | "700" | "800";
  fontStyle?: "normal" | "italic";
  textAlign?: "left" | "center" | "right";
  letterSpacingEm?: number;
  lineHeight?: number;
  textTransform?: "none" | "uppercase" | "lowercase";
  color?: string;

  // Shape / Line / Border properties
  shapeVariant?:
    | "rect"
    | "circle"
    | "pill"
    | "diamond"
    | "arch"
    | "frame"
    | "diagonal-band"
    | "gold-ribbon-bar";
  fillColor?: string;
  fillGradientEnd?: string;
  fillGradientAngle?: number;
  strokeColor?: string;
  strokeWidthMm?: number;
  borderRadiusMm?: number;

  // Icon / Monogram properties
  iconName?: IconChoice;
  monogramText?: string;
  badgeStyle?:
    | "circle-gold"
    | "square-architectural"
    | "hexagon"
    | "minimal-frame"
    | "hezlon-skyline-crest"
    | "solid-circle"
    | "gold-ring-icon";

  // Image / Logo / Photo properties
  imageUrl?: string;
  objectFit?: "cover" | "contain";
  defaultMasterText?: string;

  // QR properties
  qrForeground?: string;
  qrBackground?: string;
  qrIncludeLogo?: boolean;
  qrFrameStyle?: "none" | "thin-gold" | "corner-brackets" | "solid-pad" | "rounded-gold";
}

export interface CardBackground {
  type:
    | "solid"
    | "gradient"
    | "architectural-grid"
    | "split-panel"
    | "luxury-border";
  primaryColor: string;
  secondaryColor?: string;
  accentColor?: string;
  backgroundImageUrl?: string;
  gradientAngle?: number;
  patternOpacity?: number;
  borderInsetMm?: number;
  borderWidthMm?: number;
  splitRatio?: number; // 0.1 to 0.9
  splitDirection?:
    | "vertical"
    | "horizontal"
    | "diagonal"
    | "diagonal-left-gold"
    | "chevron-left-gold"
    | "back-showcase-ribbon"
    | "back-chevron-matrix";
}

export interface CardTemplateData {
  slug: string;
  name: string;
  category:
    | "Luxury Corporate"
    | "Modern Minimalist"
    | "Dark Premium"
    | "Forest Green & Gold"
    | "Black & Gold"
    | "White & Emerald"
    | "Construction & Engineering"
    | "Architectural"
    | "Glass & Aluminium"
    | "Modern Industrial"
    | "Elegant Professional"
    | "Creative Corporate";
  description: string;
  widthMm: number;
  heightMm: number;
  isDoubleSided: boolean;
  paperFinish: PaperFinish;
  cornerStyle: CornerStyle;
  accentColor: string;
  previewPalette: string[];
  isFeatured: boolean;
  frontBg: CardBackground;
  backBg: CardBackground;
  frontElements: CanvasElement[];
  backElements: CanvasElement[];
}

export interface PrintValidationIssue {
  id: string;
  severity: "PASS" | "WARNING" | "ERROR";
  category:
    | "QR_READABILITY"
    | "FONTS"
    | "IMAGE_RESOLUTION"
    | "DIMENSIONS"
    | "SAFE_MARGIN"
    | "BLEED";
  title: string;
  message: string;
  side?: CardSide;
  elementId?: string;
}

export interface PrintValidationReport {
  isPrintReady: boolean;
  score: number;
  checkedAt: string;
  dimensionsMm: {
    trimWidth: number;
    trimHeight: number;
    bleed: number;
    totalWidthWithBleed: number;
    totalHeightWithBleed: number;
    safeMargin: number;
  };
  issues: PrintValidationIssue[];
}

export interface CompanyInfoState {
  companyName: string;
  professionalTitle: string;
  phone: string;
  whatsapp: string;
  email: string;
  description: string;
  instagram: string;
  facebook: string;
  website: string;
  physicalAddress: string;
  workingHours: string;
  logoUrl: string;
  ownerPhotoUrl: string;
  coverImageUrl: string;
  galleryImages: string[];
  defaultWidthMm: number;
  defaultHeightMm: number;
  defaultBleedMm: number;
  defaultSafeMarginMm: number;
}

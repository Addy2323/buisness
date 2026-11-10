"use client";

import React, { useRef, useState, useEffect } from "react";
import {
  CanvasElement,
  CardBackground,
  CardSide,
  CompanyInfoState,
  CornerStyle,
  PaperFinish,
} from "@/types/studio";
import {
  Award,
  Building2,
  Compass,
  Facebook,
  Globe,
  Instagram,
  Layers,
  Mail,
  MapPin,
  Phone,
  Shield,
  Smartphone,
  Sparkles,
} from "lucide-react";
import { usePermanentQrMatrix } from "@/lib/use-qr-matrix";

interface CardCanvasRendererProps {
  widthMm: number;
  heightMm: number;
  bleedMm?: number;
  safeMarginMm?: number;
  side: CardSide;
  background: CardBackground;
  elements: CanvasElement[];
  paperFinish?: PaperFinish;
  cornerStyle?: CornerStyle;
  companyInfo?: Partial<CompanyInfoState>;
  qrSvgDataUrl?: string;
  showPrintGuides?: boolean;
  interactive?: boolean;
  selectedElementId?: string | null;
  onSelectElement?: (id: string | null) => void;
  onUpdateElement?: (id: string, patch: Partial<CanvasElement>) => void;
  scalePxPerMm?: number;
  className?: string;
}

export function resolveElementText(
  el: CanvasElement,
  companyInfo?: Partial<CompanyInfoState>
): string {
  if (!companyInfo || !el.bindField || el.bindField === "custom") {
    return el.text || "";
  }
  return el.text || String(companyInfo[el.bindField] || "");
}

export const CardCanvasRenderer: React.FC<CardCanvasRendererProps> = ({
  widthMm = 90,
  heightMm = 50,
  bleedMm = 3,
  safeMarginMm = 5,
  background,
  elements,
  paperFinish = "MATTE",
  cornerStyle = "SQUARE",
  companyInfo,
  showPrintGuides = false,
  interactive = false,
  selectedElementId = null,
  onSelectElement,
  onUpdateElement,
  scalePxPerMm = 6.5,
  className = "",
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const qrMatrix = usePermanentQrMatrix();
  const [dragState, setDragState] = useState<{
    id: string;
    mode: "move" | "resize" | "rotate";
    startX: number;
    startY: number;
    origXMm: number;
    origYMm: number;
    origWMm: number;
    origHMm: number;
    origRotation: number;
  } | null>(null);

  const [snapGuide, setSnapGuide] = useState<{
    verticalCenter: boolean;
    horizontalCenter: boolean;
  }>({ verticalCenter: false, horizontalCenter: false });

  const widthPx = widthMm * scalePxPerMm;
  const heightPx = heightMm * scalePxPerMm;
  const borderRadiusPx = cornerStyle === "ROUNDED" ? 3.5 * scalePxPerMm : 0;

  useEffect(() => {
    if (!dragState || !interactive || !onUpdateElement) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dxMm = (e.clientX - dragState.startX) / scalePxPerMm;
      const dyMm = (e.clientY - dragState.startY) / scalePxPerMm;

      if (dragState.mode === "move") {
        let nextX = Number((dragState.origXMm + dxMm).toFixed(2));
        let nextY = Number((dragState.origYMm + dyMm).toFixed(2));

        const elCenterX = nextX + dragState.origWMm / 2;
        const elCenterY = nextY + dragState.origHMm / 2;
        const cardCenterX = widthMm / 2;
        const cardCenterY = heightMm / 2;

        let vSnap = false;
        let hSnap = false;

        if (Math.abs(elCenterX - cardCenterX) < 0.9) {
          nextX = Number((cardCenterX - dragState.origWMm / 2).toFixed(2));
          vSnap = true;
        }
        if (Math.abs(elCenterY - cardCenterY) < 0.9) {
          nextY = Number((cardCenterY - dragState.origHMm / 2).toFixed(2));
          hSnap = true;
        }

        setSnapGuide({ verticalCenter: vSnap, horizontalCenter: hSnap });
        onUpdateElement(dragState.id, { xMm: nextX, yMm: nextY });
      } else if (dragState.mode === "resize") {
        const nextW = Math.max(3, Number((dragState.origWMm + dxMm).toFixed(2)));
        const nextH = Math.max(0.5, Number((dragState.origHMm + dyMm).toFixed(2)));
        onUpdateElement(dragState.id, { widthMm: nextW, heightMm: nextH });
      } else if (dragState.mode === "rotate") {
        const nextRot = Math.round((dragState.origRotation + dxMm * 2) % 360);
        onUpdateElement(dragState.id, { rotation: nextRot });
      }
    };

    const handleMouseUp = () => {
      setDragState(null);
      setSnapGuide({ verticalCenter: false, horizontalCenter: false });
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragState, interactive, onUpdateElement, scalePxPerMm, widthMm, heightMm]);

  const sortedElements = [...elements]
    .filter((e) => !e.hidden)
    .sort((a, b) => a.zIndex - b.zIndex);

  const renderArchitecturalIcon = (
    name?: string,
    color = "#C9A96E",
    size = 16
  ) => {
    const props = { size, color, strokeWidth: 1.8 };
    switch (name) {
      case "door-window":
        return (
          <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke={color}
            strokeWidth="1.7"
          >
            <rect x="3" y="3" width="18" height="18" rx="1" />
            <line x1="12" y1="3" x2="12" y2="21" />
            <circle cx="9.5" cy="12" r="0.8" fill={color} />
            <circle cx="14.5" cy="12" r="0.8" fill={color} />
          </svg>
        );
      case "glass-frame":
        return (
          <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke={color}
            strokeWidth="1.7"
          >
            <rect x="4" y="4" width="16" height="16" rx="1" />
            <line x1="7" y1="17" x2="17" y2="7" />
            <line x1="11" y1="17" x2="17" y2="11" />
          </svg>
        );
      case "office-partition":
        return (
          <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke={color}
            strokeWidth="1.7"
          >
            <rect x="3" y="4" width="18" height="16" rx="1" />
            <line x1="12" y1="4" x2="12" y2="20" />
            <line x1="3" y1="12" x2="21" y2="12" />
          </svg>
        );
      case "balustrade":
        return (
          <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke={color}
            strokeWidth="1.7"
          >
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
            <line x1="6" y1="6" x2="6" y2="18" />
            <line x1="10" y1="6" x2="10" y2="18" />
            <line x1="14" y1="6" x2="14" y2="18" />
            <line x1="18" y1="6" x2="18" y2="18" />
          </svg>
        );
      case "curtain":
        return (
          <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke={color}
            strokeWidth="1.7"
          >
            <line x1="3" y1="4" x2="21" y2="4" />
            <path d="M4,4 C4,12 9,14 9,20 L4,20 Z" />
            <path d="M20,4 C20,12 15,14 15,20 L20,20 Z" />
          </svg>
        );
      case "gear-building":
        return <Sparkles {...props} />;
      case "smartphone":
        return <Smartphone {...props} />;
      case "phone":
      case "phone-solid":
        return <Phone {...props} />;
      case "mail":
      case "mail-solid":
        return <Mail {...props} />;
      case "globe":
        return <Globe {...props} />;
      case "map-pin":
        return <MapPin {...props} />;
      case "instagram":
        return <Instagram {...props} />;
      case "facebook":
        return <Facebook {...props} />;
      case "shield":
        return <Shield {...props} />;
      case "sparkles":
        return <Sparkles {...props} />;
      case "layers":
        return <Layers {...props} />;
      case "award":
        return <Award {...props} />;
      case "compass":
        return <Compass {...props} />;
      default:
        return <Building2 {...props} />;
    }
  };

  return (
    <div
      ref={containerRef}
      onClick={(e) => {
        if (interactive && e.target === containerRef.current && onSelectElement) {
          onSelectElement(null);
        }
      }}
      style={{
        width: `${widthPx}px`,
        height: `${heightPx}px`,
        borderRadius: `${borderRadiusPx}px`,
      }}
      className={`relative select-none overflow-hidden shadow-luxury transition-shadow ${className}`}
    >
      {/* 1. Background Layer */}
      <div
        onClick={() => interactive && onSelectElement && onSelectElement(null)}
        className="absolute inset-0"
        style={{
          background:
            background.type === "gradient"
              ? `linear-gradient(${background.gradientAngle ?? 135}deg, ${
                  background.primaryColor
                }, ${background.secondaryColor || background.primaryColor})`
              : background.primaryColor,
        }}
      >
        {background.backgroundImageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={background.backgroundImageUrl}
            alt="Card Background"
            className="absolute inset-0 w-full h-full object-fill pointer-events-none z-[1]"
          />
        )}
        {!background.backgroundImageUrl && background.type === "split-panel" && (
          <>
            {background.splitDirection === "horizontal" ? (
              <div
                style={{
                  top: `${(background.splitRatio ?? 0.5) * 100}%`,
                  bottom: 0,
                  left: 0,
                  right: 0,
                  backgroundColor: background.secondaryColor || "#F8F5EE",
                }}
                className="absolute"
              />
            ) : background.splitDirection === "diagonal" ? (
              <div
                style={{
                  clipPath: "polygon(44% 0, 100% 0, 100% 100%, 26% 100%)",
                  backgroundColor: background.secondaryColor || "#F8F5EE",
                }}
                className="absolute inset-0"
              />
            ) : background.splitDirection === "diagonal-left-gold" ? (
              /* Image 1 Front: Deep forest left with angled gold ribbon opening onto alabaster right */
              <svg
                viewBox="0 0 90 50"
                preserveAspectRatio="none"
                className="absolute inset-0 w-full h-full pointer-events-none"
              >
                {/* Right Alabaster Panel */}
                <polygon
                  points="32,0 90,0 90,50 48,50 36,28"
                  fill={background.secondaryColor || "#F5F5F3"}
                />
                {/* Gold Diagonal Ribbon Divider */}
                <polygon
                  points="30.8,0 32.4,0 37.2,27.5 49.5,50 46.5,50 34.8,28.5"
                  fill={background.accentColor || "#D4A84F"}
                />
              </svg>
            ) : background.splitDirection === "chevron-left-gold" ? (
              /* Image 2 Front: Deep forest left with double gold chevron pointing right onto alabaster right */
              <svg
                viewBox="0 0 90 50"
                preserveAspectRatio="none"
                className="absolute inset-0 w-full h-full pointer-events-none"
              >
                {/* Right Alabaster Panel */}
                <polygon
                  points="33,0 90,0 90,50 33,50 44,25"
                  fill={background.secondaryColor || "#F7F7F5"}
                />
                {/* Primary Gold Chevron Band */}
                <polygon
                  points="29.5,0 32,0 42.8,25 32,50 29.5,50 40.3,25"
                  fill={background.accentColor || "#C9A24D"}
                />
                {/* Thin Inner Dark & Gold Accent Line */}
                <polygon
                  points="32.8,0 33.6,0 44.4,25 33.6,50 32.8,50 43.6,25"
                  fill="#09261E"
                />
              </svg>
            ) : background.splitDirection === "back-showcase-ribbon" ? (
              /* Image 1 Back: Deep forest main + right diagonal gold divider + bottom gold social ribbon bar */
              <svg
                viewBox="0 0 90 50"
                preserveAspectRatio="none"
                className="absolute inset-0 w-full h-full pointer-events-none"
              >
                {/* Angled Gold Separator for Right Photo Zone */}
                <polygon
                  points="57.5,0 59.2,0 74.5,39.5 72.8,39.5"
                  fill={background.accentColor || "#D4A84F"}
                />
                {/* Bottom Left-Center Gold Ribbon Bar */}
                <polygon
                  points="0,40.5 64,40.5 61,50 0,50"
                  fill={background.accentColor || "#D4A84F"}
                />
                {/* Bottom Right Dark Green Footer Strip */}
                <polygon
                  points="64,40.5 90,38.5 90,50 61,50"
                  fill="#071F18"
                />
              </svg>
            ) : background.splitDirection === "back-chevron-matrix" ? (
              /* Image 2 Back: Deep forest main + angled right gold border + bottom-right gold chevron corner */
              <svg
                viewBox="0 0 90 50"
                preserveAspectRatio="none"
                className="absolute inset-0 w-full h-full pointer-events-none"
              >
                {/* Right Diagonal Gold Line */}
                <polygon
                  points="61.5,0 63.2,0 72,33 59,50 56.8,50 70.2,33"
                  fill={background.accentColor || "#C9A24D"}
                />
                {/* Bottom-Right Dark Forest Triangle */}
                <polygon
                  points="59,50 71.2,33.5 90,41 90,50"
                  fill="#071F18"
                />
                {/* Gold Trim along Bottom-Right Triangle */}
                <polygon
                  points="71.2,33.5 72,32.5 90,40 90,41.2"
                  fill={background.accentColor || "#C9A24D"}
                />
              </svg>
            ) : (
              <>
                <div
                  style={{
                    left: `${(background.splitRatio ?? 0.38) * 100}%`,
                    right: 0,
                    top: 0,
                    bottom: 0,
                    backgroundColor: background.secondaryColor || "#F8F5EE",
                  }}
                  className="absolute"
                />
                {background.accentColor && (
                  <div
                    style={{
                      left: `calc(${(background.splitRatio ?? 0.38) * 100}% - 1px)`,
                      width: `${0.7 * scalePxPerMm}px`,
                      top: 0,
                      bottom: 0,
                      backgroundColor: background.accentColor,
                    }}
                    className="absolute"
                  />
                )}
              </>
            )}
          </>
        )}

        {background.type === "luxury-border" && (
          <>
            <div
              style={{
                inset: `${(background.borderInsetMm || 4.5) * scalePxPerMm}px`,
                borderColor: background.accentColor || "#C9A96E",
                borderWidth: `${Math.max(
                  1,
                  (background.borderWidthMm || 0.35) * scalePxPerMm
                )}px`,
              }}
              className="pointer-events-none absolute border"
            />
            <div
              style={{
                inset: `${((background.borderInsetMm || 4.5) + 1) * scalePxPerMm}px`,
                borderColor: background.accentColor || "#C9A96E",
                borderWidth: "1px",
                opacity: 0.45,
              }}
              className="pointer-events-none absolute border"
            />
          </>
        )}

        {background.type === "architectural-grid" && (
          <div
            style={{
              backgroundImage: `linear-gradient(to right, ${
                background.accentColor || "#C9A96E"
              } 1px, transparent 1px), linear-gradient(to bottom, ${
                background.accentColor || "#C9A96E"
              } 1px, transparent 1px)`,
              backgroundSize: `${10 * scalePxPerMm}px ${10 * scalePxPerMm}px`,
              opacity: background.patternOpacity ?? 0.14,
            }}
            className="pointer-events-none absolute inset-0"
          />
        )}
      </div>

      {/* 2. Paper Finish Sheen Overlay */}
      {paperFinish === "GLOSS" && (
        <div
          style={{
            background:
              "linear-gradient(125deg, rgba(255,255,255,0) 20%, rgba(255,255,255,0.12) 46%, rgba(255,255,255,0) 65%)",
          }}
          className="pointer-events-none absolute inset-0 z-30"
        />
      )}
      {paperFinish === "TEXTURED" && (
        <div
          style={{
            backgroundImage:
              "radial-gradient(rgba(255,255,255,0.06) 1px, transparent 0), radial-gradient(rgba(0,0,0,0.05) 1px, transparent 0)",
            backgroundSize: "6px 6px",
            backgroundPosition: "0 0, 3px 3px",
          }}
          className="pointer-events-none absolute inset-0 z-30"
        />
      )}

      {/* 3. Elements Layer */}
      {sortedElements.map((el) => {
        const isSelected = interactive && selectedElementId === el.id;
        const leftPx = el.xMm * scalePxPerMm;
        const topPx = el.yMm * scalePxPerMm;
        const wPx = el.widthMm * scalePxPerMm;
        const hPx = el.heightMm * scalePxPerMm;
        const fontSizePx = (el.fontSizePt || 8) * 0.3528 * scalePxPerMm;

        return (
          <div
            key={el.id}
            onMouseDown={(e) => {
              if (!interactive) return;
              e.stopPropagation();
              onSelectElement?.(el.id);
              if (el.locked) return;
              setDragState({
                id: el.id,
                mode: "move",
                startX: e.clientX,
                startY: e.clientY,
                origXMm: el.xMm,
                origYMm: el.yMm,
                origWMm: el.widthMm,
                origHMm: el.heightMm,
                origRotation: el.rotation || 0,
              });
            }}
            style={{
              left: `${leftPx}px`,
              top: `${topPx}px`,
              width: `${wPx}px`,
              height: `${hPx}px`,
              transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
              opacity: el.opacity ?? 1,
              zIndex: el.zIndex + 5,
            }}
            className={`absolute ${
              interactive
                ? "cursor-move hover:outline hover:outline-1 hover:outline-gold/60"
                : ""
            } ${
              isSelected
                ? "outline outline-2 outline-gold shadow-[0_0_0_2px_rgba(13,43,34,0.5)]"
                : ""
            }`}
          >
            {/* TEXT ELEMENT */}
            {el.type === "text" && (() => {
              const resolvedTxt = resolveElementText(el, companyInfo);
              const isUnmodifiedMaster =
                Boolean(el.defaultMasterText) &&
                resolvedTxt.trim() === el.defaultMasterText?.trim();
              return (
                <div
                  style={{
                    fontFamily:
                      el.fontFamily === "Playfair Display" ||
                      el.fontFamily === "Cormorant Garamond" ||
                      el.fontFamily === "Cinzel"
                        ? `"${el.fontFamily}", Georgia, serif`
                        : el.fontFamily === "JetBrains Mono"
                        ? `"JetBrains Mono", monospace`
                        : `"${el.fontFamily || "Inter"}", system-ui, sans-serif`,
                    fontSize: `${fontSizePx}px`,
                    fontWeight: el.fontWeight || "500",
                    fontStyle: el.fontStyle || "normal",
                    textAlign: el.textAlign || "left",
                    letterSpacing: el.letterSpacingEm
                      ? `${el.letterSpacingEm}em`
                      : undefined,
                    lineHeight: el.lineHeight || 1.25,
                    textTransform: el.textTransform || "none",
                    color: el.color || "#FFFFFF",
                    backgroundColor:
                      !isUnmodifiedMaster && el.fillColor
                        ? el.fillColor
                        : undefined,
                    opacity: isUnmodifiedMaster ? 0 : 1,
                    whiteSpace: "pre-line",
                    padding:
                      !isUnmodifiedMaster && el.fillColor ? "1px 2px" : undefined,
                    borderRadius:
                      !isUnmodifiedMaster && el.fillColor ? "2px" : undefined,
                  }}
                  className="w-full h-full flex flex-col justify-center overflow-visible"
                >
                  {resolvedTxt}
                </div>
              );
            })()}

            {/* LINE ELEMENT */}
            {el.type === "line" && (
              <div
                style={{
                  width: "100%",
                  height: `${Math.max(1.5, hPx)}px`,
                  backgroundColor: el.fillColor || "#C9A96E",
                }}
              />
            )}

            {/* SHAPE ELEMENT */}
            {el.type === "shape" && (
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  backgroundColor:
                    el.shapeVariant === "frame"
                      ? "transparent"
                      : el.fillColor || "#0D2B22",
                  border:
                    el.shapeVariant === "frame" || el.strokeColor
                      ? `${Math.max(
                          1,
                          (el.strokeWidthMm || 0.35) * scalePxPerMm
                        )}px solid ${el.strokeColor || "#C9A96E"}`
                      : undefined,
                  borderRadius:
                    el.shapeVariant === "circle"
                      ? "9999px"
                      : el.shapeVariant === "pill"
                      ? `${Math.min(wPx, hPx) / 2}px`
                      : el.borderRadiusMm
                      ? `${el.borderRadiusMm * scalePxPerMm}px`
                      : "0px",
                }}
              />
            )}

            {/* MONOGRAM OR ARCHITECTURAL SKYLINE CREST */}
            {el.type === "monogram" &&
              (el.badgeStyle === "hezlon-skyline-crest" ? (
                <svg
                  viewBox="0 0 240 150"
                  className="w-full h-full overflow-visible"
                >
                  <polygon
                    points="30,92 104,30 104,55 86,70 86,140 54,140 54,76"
                    fill={el.color || "#D4A84F"}
                  />
                  <polygon
                    points="22,92 104,22 104,30 30,92"
                    fill="#E8CA82"
                  />
                  <rect x="63" y="88" width="7" height="7" fill="#09261E" />
                  <rect x="73" y="88" width="7" height="7" fill="#09261E" />
                  <rect x="63" y="98" width="7" height="7" fill="#09261E" />
                  <rect x="73" y="98" width="7" height="7" fill="#09261E" />
                  <rect
                    x="42"
                    y="96"
                    width="6"
                    height="6"
                    fill={el.color || "#D4A84F"}
                  />
                  <rect
                    x="42"
                    y="105"
                    width="6"
                    height="6"
                    fill={el.color || "#D4A84F"}
                  />
                  <polygon
                    points="109,12 128,28 128,140 109,140"
                    fill="#FFFFFF"
                  />
                  <polygon
                    points="134,38 153,52 153,140 134,140"
                    fill={el.color || "#D4A84F"}
                  />
                  <rect x="139" y="52" width="2.5" height="82" fill="#09261E" />
                  <rect x="145" y="56" width="2.5" height="78" fill="#09261E" />
                  <polygon
                    points="157,62 178,78 178,126 205,140 157,140"
                    fill={el.color || "#D4A84F"}
                  />
                  <rect x="162" y="76" width="3" height="58" fill="#09261E" />
                  <rect x="169" y="82" width="3" height="52" fill="#09261E" />
                </svg>
              ) : (
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    backgroundColor: el.fillColor || "#133B2E",
                    border: `1.5px solid ${el.strokeColor || "#C9A96E"}`,
                    borderRadius:
                      el.badgeStyle === "square-architectural"
                        ? "2px"
                        : "9999px",
                    color: el.color || "#C9A96E",
                    fontSize: `${Math.min(wPx, hPx) * 0.5}px`,
                    fontFamily: "Georgia, serif",
                  }}
                  className="flex items-center justify-center font-bold tracking-wider"
                >
                  {el.monogramText || "H"}
                </div>
              ))}

            {/* ICON ELEMENT (Plain, Gold-Ringed Service Badge, or Solid Circle Contact Icon) */}
            {el.type === "icon" && (
              <div
                style={{
                  backgroundColor:
                    el.badgeStyle === "solid-circle"
                      ? el.fillColor || "#0D2B22"
                      : el.badgeStyle === "gold-ring-icon"
                      ? el.fillColor || "rgba(9,38,30,0.85)"
                      : "transparent",
                  border:
                    el.badgeStyle === "gold-ring-icon"
                      ? `${Math.max(1, 0.32 * scalePxPerMm)}px solid ${
                          el.strokeColor || "#D4A84F"
                        }`
                      : undefined,
                  borderRadius:
                    el.badgeStyle === "solid-circle" ||
                    el.badgeStyle === "gold-ring-icon"
                      ? "9999px"
                      : undefined,
                }}
                className="w-full h-full flex items-center justify-center"
              >
                {renderArchitecturalIcon(
                  el.iconName,
                  el.color || "#C9A96E",
                  Math.min(wPx, hPx) *
                    (el.badgeStyle === "solid-circle" ||
                    el.badgeStyle === "gold-ring-icon"
                      ? 0.56
                      : 0.82)
                )}
              </div>
            )}

            {/* QR CODE ELEMENT */}
            {el.type === "qr" && (
              <div
                style={{
                  backgroundColor: el.qrBackground || "#FFFFFF",
                  border:
                    el.qrFrameStyle === "thin-gold" ||
                    el.qrFrameStyle === "rounded-gold"
                      ? `${Math.max(1.5, 0.4 * scalePxPerMm)}px solid #D4A84F`
                      : el.qrFrameStyle === "corner-brackets"
                      ? "1.5px dashed #0D2B22"
                      : "none",
                  borderRadius:
                    el.qrFrameStyle === "rounded-gold"
                      ? `${2 * scalePxPerMm}px`
                      : "3px",
                  padding:
                    el.qrFrameStyle && el.qrFrameStyle !== "none"
                      ? `${Math.max(2, scalePxPerMm * 0.45)}px`
                      : "0px",
                }}
                className="w-full h-full flex items-center justify-center relative"
                data-qr-url={qrMatrix.url}
              >
                {/* Real, scannable QR generated by `qrcode` library (Level H) */}
                <svg
                  viewBox={`-1.5 -1.5 ${qrMatrix.size + 3} ${qrMatrix.size + 3}`}
                  className="w-full h-full"
                  shapeRendering="crispEdges"
                  aria-label={`QR code: ${qrMatrix.url}`}
                >
                  <rect
                    x={-1.5}
                    y={-1.5}
                    width={qrMatrix.size + 3}
                    height={qrMatrix.size + 3}
                    fill={el.qrBackground || "#FFFFFF"}
                  />
                  <path
                    d={qrMatrix.path}
                    fill={el.qrForeground || "#0D2B22"}
                  />
                </svg>
              </div>
            )}

            {/* LOGO OR PHOTO ELEMENT */}
            {(el.type === "logo" || el.type === "photo") && (
              <div
                style={{
                  borderRadius:
                    el.badgeStyle === "circle-gold"
                      ? "9999px"
                      : el.borderRadiusMm
                      ? `${el.borderRadiusMm * scalePxPerMm}px`
                      : undefined,
                  border:
                    el.badgeStyle === "circle-gold" || el.strokeColor
                      ? `${Math.max(
                          1.5,
                          (el.strokeWidthMm || 0.5) * scalePxPerMm
                        )}px solid ${el.strokeColor || "#C9A24D"}`
                      : undefined,
                }}
                className="w-full h-full flex items-center justify-center overflow-hidden"
              >
                {el.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={el.imageUrl}
                    alt={el.label}
                    className={`w-full h-full ${
                      el.objectFit === "cover"
                        ? "object-cover"
                        : "object-contain"
                    }`}
                  />
                ) : (
                  <div className="w-full h-full border border-dashed border-gold/60 bg-forest-900/40 flex flex-col items-center justify-center text-[9px] text-gold text-center p-1">
                    <span>{el.type === "logo" ? "LOGO" : "PHOTO"}</span>
                  </div>
                )}
              </div>
            )}

            {/* Resize & Rotate Handles when selected in Interactive Editor */}
            {isSelected && !el.locked && (
              <>
                <div
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    setDragState({
                      id: el.id,
                      mode: "resize",
                      startX: e.clientX,
                      startY: e.clientY,
                      origXMm: el.xMm,
                      origYMm: el.yMm,
                      origWMm: el.widthMm,
                      origHMm: el.heightMm,
                      origRotation: el.rotation || 0,
                    });
                  }}
                  title="Drag to resize"
                  className="absolute -right-2 -bottom-2 w-3.5 h-3.5 bg-gold border-2 border-forest-950 rounded-full cursor-se-resize z-50"
                />
                <div
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    setDragState({
                      id: el.id,
                      mode: "rotate",
                      startX: e.clientX,
                      startY: e.clientY,
                      origXMm: el.xMm,
                      origYMm: el.yMm,
                      origWMm: el.widthMm,
                      origHMm: el.heightMm,
                      origRotation: el.rotation || 0,
                    });
                  }}
                  title="Drag horizontally to rotate"
                  className="absolute left-1/2 -translate-x-1/2 -top-4 w-3 h-3 bg-emerald-400 border border-forest-950 rounded-full cursor-ew-resize z-50"
                />
              </>
            )}
          </div>
        );
      })}

      {/* 4. Visual Alignment Guides & Safe Printing Margins Overlay */}
      {showPrintGuides && (
        <div className="pointer-events-none absolute inset-0 z-40">
          <div
            style={{
              inset: `${safeMarginMm * scalePxPerMm}px`,
            }}
            className="absolute border border-dashed border-emerald-400/75"
          >
            <span className="absolute -top-3.5 left-1 bg-forest-950/85 text-emerald-300 text-[8px] font-mono px-1 rounded">
              SAFE MARGIN ({safeMarginMm}mm)
            </span>
          </div>

          <div className="absolute inset-0 border border-rose-400/60">
            <span className="absolute bottom-0.5 right-1 bg-forest-950/85 text-rose-300 text-[8px] font-mono px-1 rounded">
              TRIM {widthMm}×{heightMm}mm (+{bleedMm}mm BLEED)
            </span>
          </div>

          {snapGuide.verticalCenter && (
            <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-gold shadow-gold-glow" />
          )}
          {snapGuide.horizontalCenter && (
            <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-gold shadow-gold-glow" />
          )}
        </div>
      )}
    </div>
  );
};

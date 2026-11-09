"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import {
  CanvasElement,
  CardBackground,
  CompanyInfoState,
  CornerStyle,
  PaperFinish,
} from "@/types/studio";
import { resolveElementText } from "./CardCanvasRenderer";
import { QrMatrix, usePermanentQrMatrix } from "@/lib/use-qr-matrix";
import { RotateCcw, FlipHorizontal, Sparkles, Pause, Play } from "lucide-react";

interface Card3DPreviewProps {
  widthMm: number;
  heightMm: number;
  frontBg: CardBackground;
  backBg: CardBackground;
  frontElements: CanvasElement[];
  backElements: CanvasElement[];
  isDoubleSided?: boolean;
  paperFinish: PaperFinish;
  cornerStyle: CornerStyle;
  companyInfo?: Partial<CompanyInfoState>;
  className?: string;
}

function paintCardSideToCanvas(
  widthMm: number,
  heightMm: number,
  bg: CardBackground,
  elements: CanvasElement[],
  paperFinish: PaperFinish,
  companyInfo?: Partial<CompanyInfoState>,
  loadedImages?: Map<string, HTMLImageElement>,
  qrMatrix?: QrMatrix
): HTMLCanvasElement {
  const scale = 12; // 12 px per mm => 1080 x 600 high-res texture
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(widthMm * scale);
  canvas.height = Math.round(heightMm * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  const W = canvas.width;
  const H = canvas.height;
  const sx = W / 90;
  const sy = H / 50;

  // 1. Paint Background
  if (bg.backgroundImageUrl && loadedImages?.get(bg.backgroundImageUrl)) {
    const bgImg = loadedImages.get(bg.backgroundImageUrl)!;
    ctx.drawImage(bgImg, 0, 0, W, H);
  } else if (bg.type === "gradient") {
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, bg.primaryColor || "#0D2B22");
    grad.addColorStop(1, bg.secondaryColor || bg.primaryColor || "#1B4B3A");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  } else {
    ctx.fillStyle = bg.primaryColor || "#0D2B22";
    ctx.fillRect(0, 0, W, H);
  }

  if (!bg.backgroundImageUrl && bg.type === "split-panel") {
    const ratio = bg.splitRatio ?? 0.38;
    ctx.fillStyle = bg.secondaryColor || "#F8F5EE";
    if (bg.splitDirection === "horizontal") {
      ctx.fillRect(0, H * ratio, W, H * (1 - ratio));
    } else if (bg.splitDirection === "diagonal") {
      ctx.beginPath();
      ctx.moveTo(W * 0.44, 0);
      ctx.lineTo(W, 0);
      ctx.lineTo(W, H);
      ctx.lineTo(W * 0.26, H);
      ctx.closePath();
      ctx.fill();
    } else if (bg.splitDirection === "diagonal-left-gold") {
      ctx.beginPath();
      ctx.moveTo(32 * sx, 0);
      ctx.lineTo(90 * sx, 0);
      ctx.lineTo(90 * sx, 50 * sy);
      ctx.lineTo(48 * sx, 50 * sy);
      ctx.lineTo(36 * sx, 28 * sy);
      ctx.closePath();
      ctx.fillStyle = bg.secondaryColor || "#F5F5F3";
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(30.8 * sx, 0);
      ctx.lineTo(32.4 * sx, 0);
      ctx.lineTo(37.2 * sx, 27.5 * sy);
      ctx.lineTo(49.5 * sx, 50 * sy);
      ctx.lineTo(46.5 * sx, 50 * sy);
      ctx.lineTo(34.8 * sx, 28.5 * sy);
      ctx.closePath();
      ctx.fillStyle = bg.accentColor || "#D4A84F";
      ctx.fill();
    } else if (bg.splitDirection === "chevron-left-gold") {
      ctx.beginPath();
      ctx.moveTo(33 * sx, 0);
      ctx.lineTo(90 * sx, 0);
      ctx.lineTo(90 * sx, 50 * sy);
      ctx.lineTo(33 * sx, 50 * sy);
      ctx.lineTo(44 * sx, 25 * sy);
      ctx.closePath();
      ctx.fillStyle = bg.secondaryColor || "#F7F7F5";
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(29.5 * sx, 0);
      ctx.lineTo(32 * sx, 0);
      ctx.lineTo(42.8 * sx, 25 * sy);
      ctx.lineTo(32 * sx, 50 * sy);
      ctx.lineTo(29.5 * sx, 50 * sy);
      ctx.lineTo(40.3 * sx, 25 * sy);
      ctx.closePath();
      ctx.fillStyle = bg.accentColor || "#C9A24D";
      ctx.fill();
    } else if (bg.splitDirection === "back-showcase-ribbon") {
      ctx.beginPath();
      ctx.moveTo(57.5 * sx, 0);
      ctx.lineTo(59.2 * sx, 0);
      ctx.lineTo(74.5 * sx, 39.5 * sy);
      ctx.lineTo(72.8 * sx, 39.5 * sy);
      ctx.closePath();
      ctx.fillStyle = bg.accentColor || "#D4A84F";
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(0, 40.5 * sy);
      ctx.lineTo(64 * sx, 40.5 * sy);
      ctx.lineTo(61 * sx, 50 * sy);
      ctx.lineTo(0, 50 * sy);
      ctx.closePath();
      ctx.fillStyle = bg.accentColor || "#D4A84F";
      ctx.fill();
    } else if (bg.splitDirection === "back-chevron-matrix") {
      ctx.beginPath();
      ctx.moveTo(61.5 * sx, 0);
      ctx.lineTo(63.2 * sx, 0);
      ctx.lineTo(72 * sx, 33 * sy);
      ctx.lineTo(59 * sx, 50 * sy);
      ctx.lineTo(56.8 * sx, 50 * sy);
      ctx.lineTo(70.2 * sx, 33 * sy);
      ctx.closePath();
      ctx.fillStyle = bg.accentColor || "#C9A24D";
      ctx.fill();
    } else {
      ctx.fillRect(W * ratio, 0, W * (1 - ratio), H);
      if (bg.accentColor) {
        ctx.fillStyle = bg.accentColor;
        ctx.fillRect(W * ratio - 3, 0, 6, H);
      }
    }
  } else if (bg.type === "luxury-border") {
    const inset = (bg.borderInsetMm || 4.5) * scale;
    ctx.strokeStyle = bg.accentColor || "#C9A96E";
    ctx.lineWidth = Math.max(2, (bg.borderWidthMm || 0.35) * scale);
    ctx.strokeRect(inset, inset, W - inset * 2, H - inset * 2);

    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.5;
    ctx.strokeRect(
      inset + scale,
      inset + scale,
      W - (inset + scale) * 2,
      H - (inset + scale) * 2
    );
    ctx.globalAlpha = 1;
  } else if (bg.type === "architectural-grid") {
    ctx.strokeStyle = bg.accentColor || "#C9A96E";
    ctx.globalAlpha = bg.patternOpacity ?? 0.15;
    ctx.lineWidth = 1.5;
    for (let x = 0; x <= W; x += 10 * scale) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let y = 0; y <= H; y += 10 * scale) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  // Optional textured paper subtle grain
  if (paperFinish === "TEXTURED") {
    ctx.fillStyle = "rgba(255,255,255,0.03)";
    for (let y = 0; y < H; y += 4) {
      ctx.fillRect(0, y, W, 1);
    }
  }

  // 2. Paint Elements
  const sorted = [...elements]
    .filter((e) => !e.hidden)
    .sort((a, b) => a.zIndex - b.zIndex);

  for (const el of sorted) {
    const x = el.xMm * scale;
    const y = el.yMm * scale;
    const w = el.widthMm * scale;
    const h = el.heightMm * scale;

    ctx.save();
    if (el.rotation) {
      ctx.translate(x + w / 2, y + h / 2);
      ctx.rotate((el.rotation * Math.PI) / 180);
      ctx.translate(-(x + w / 2), -(y + h / 2));
    }

    if (el.type === "shape") {
      if (el.shapeVariant === "frame") {
        ctx.strokeStyle = el.strokeColor || "#C9A96E";
        ctx.lineWidth = Math.max(2, (el.strokeWidthMm || 0.35) * scale);
        ctx.strokeRect(x, y, w, h);
      } else {
        ctx.fillStyle = el.fillColor || "#0D2B22";
        ctx.fillRect(x, y, w, h);
      }
    } else if (el.type === "line") {
      ctx.fillStyle = el.fillColor || "#C9A96E";
      ctx.fillRect(x, y, w, Math.max(3, h));
    } else if (el.type === "monogram") {
      if (el.badgeStyle === "hezlon-skyline-crest") {
        // Draw HEZLON architectural house + skyline crest
        ctx.fillStyle = el.color || "#D4A84F";
        ctx.beginPath();
        ctx.moveTo(x + w * 0.14, y + h * 0.62);
        ctx.lineTo(x + w * 0.44, y + h * 0.22);
        ctx.lineTo(x + w * 0.44, y + h * 0.92);
        ctx.lineTo(x + w * 0.24, y + h * 0.92);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(x + w * 0.46, y + h * 0.1, w * 0.09, h * 0.82);

        ctx.fillStyle = el.color || "#D4A84F";
        ctx.fillRect(x + w * 0.58, y + h * 0.28, w * 0.1, h * 0.64);
        ctx.fillRect(x + w * 0.7, y + h * 0.45, w * 0.12, h * 0.47);
      } else {
        ctx.fillStyle = el.fillColor || "#133B2E";
        ctx.strokeStyle = el.strokeColor || "#C9A96E";
        ctx.lineWidth = 3;
        if (el.badgeStyle === "square-architectural") {
          ctx.fillRect(x, y, w, h);
          ctx.strokeRect(x, y, w, h);
        } else {
          ctx.beginPath();
          ctx.arc(x + w / 2, y + h / 2, Math.min(w, h) / 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
        ctx.fillStyle = el.color || "#C9A96E";
        const mSize = Math.round(Math.min(w, h) * 0.52);
        ctx.font = `bold ${mSize}px Georgia, serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(el.monogramText || "H", x + w / 2, y + h / 2 + 2);
      }
    } else if (el.type === "icon") {
      const r = Math.min(w, h) / 2;
      if (el.badgeStyle === "solid-circle" || el.badgeStyle === "gold-ring-icon") {
        ctx.beginPath();
        ctx.arc(x + w / 2, y + h / 2, r, 0, Math.PI * 2);
        ctx.fillStyle =
          el.badgeStyle === "solid-circle"
            ? el.fillColor || "#0D2B22"
            : el.fillColor || "rgba(9,38,30,0.85)";
        ctx.fill();
        if (el.badgeStyle === "gold-ring-icon") {
          ctx.strokeStyle = el.strokeColor || "#D4A84F";
          ctx.lineWidth = 2.5;
          ctx.stroke();
        }
      }
      ctx.fillStyle = el.color || "#C9A96E";
      ctx.beginPath();
      ctx.arc(x + w / 2, y + h / 2, r * 0.35, 0, Math.PI * 2);
      ctx.fill();
    } else if ((el.type === "photo" || el.type === "logo") && el.imageUrl) {
      const img = loadedImages?.get(el.imageUrl);
      if (img) {
        ctx.save();
        if (el.badgeStyle === "circle-gold") {
          const r = Math.min(w, h) / 2;
          ctx.beginPath();
          ctx.arc(x + w / 2, y + h / 2, r, 0, Math.PI * 2);
          ctx.closePath();
          ctx.clip();
        }
        ctx.drawImage(img, x, y, w, h);
        ctx.restore();

        if (el.badgeStyle === "circle-gold" || el.strokeColor) {
          const r = Math.min(w, h) / 2;
          ctx.strokeStyle = el.strokeColor || "#C9A24D";
          ctx.lineWidth = Math.max(3, (el.strokeWidthMm || 0.5) * scale);
          if (el.badgeStyle === "circle-gold") {
            ctx.beginPath();
            ctx.arc(x + w / 2, y + h / 2, r, 0, Math.PI * 2);
            ctx.stroke();
          } else {
            ctx.strokeRect(x, y, w, h);
          }
        }
      }
    } else if (el.type === "qr" && qrMatrix) {
      ctx.fillStyle = el.qrBackground || "#FFFFFF";
      ctx.fillRect(x, y, w, h);
      if (
        el.qrFrameStyle === "thin-gold" ||
        el.qrFrameStyle === "rounded-gold"
      ) {
        ctx.strokeStyle = "#C9A96E";
        ctx.lineWidth = 3;
        ctx.strokeRect(x, y, w, h);
      }
      const quiet = 2;
      const totalModules = qrMatrix.size + quiet * 2;
      const cellW = w / totalModules;
      const cellH = h / totalModules;
      ctx.fillStyle = el.qrForeground || "#0D2B22";
      for (let r = 0; r < qrMatrix.size; r++) {
        for (let c = 0; c < qrMatrix.size; c++) {
          if (qrMatrix.isDark(r, c)) {
            ctx.fillRect(
              Math.floor(x + (c + quiet) * cellW),
              Math.floor(y + (r + quiet) * cellH),
              Math.ceil(cellW),
              Math.ceil(cellH)
            );
          }
        }
      }
    } else if (el.type === "text") {
      const rawText = resolveElementText(el, companyInfo);
      const isUnmodifiedMaster =
        Boolean(el.defaultMasterText) &&
        rawText.trim() === el.defaultMasterText?.trim();
      if (!isUnmodifiedMaster) {
        if (el.fillColor) {
          ctx.fillStyle = el.fillColor;
          ctx.fillRect(x, y, w, h);
        }
        const fontSizePx = Math.round((el.fontSizePt || 8) * 0.3528 * scale);
        const isSerif = [
          "Playfair Display",
          "Cormorant Garamond",
          "Cinzel",
        ].includes(el.fontFamily || "");
        const isMono = el.fontFamily === "JetBrains Mono";
        const family = isMono
          ? "monospace"
          : isSerif
          ? "Georgia, serif"
          : "system-ui, -apple-system, sans-serif";
        const style = el.fontStyle === "italic" ? "italic " : "";
        const weight = el.fontWeight || "500";
        ctx.font = `${style}${weight} ${fontSizePx}px ${family}`;
        ctx.fillStyle = el.color || "#FFFFFF";
        ctx.textBaseline = "top";

        const lines = rawText.split("\n");
        lines.forEach((line, idx) => {
          const formatted =
            el.textTransform === "uppercase"
              ? line.toUpperCase()
              : el.textTransform === "lowercase"
              ? line.toLowerCase()
              : line;
          let tx = x;
          if (el.textAlign === "center") {
            ctx.textAlign = "center";
            tx = x + w / 2;
          } else if (el.textAlign === "right") {
            ctx.textAlign = "right";
            tx = x + w;
          } else {
            ctx.textAlign = "left";
          }
          ctx.fillText(formatted, tx, y + idx * (fontSizePx * 1.28));
        });
      }
    }
    ctx.restore();
  }

  return canvas;
}

export const Card3DPreview: React.FC<Card3DPreviewProps> = ({
  widthMm = 90,
  heightMm = 50,
  frontBg,
  backBg,
  frontElements,
  backElements,
  isDoubleSided = true,
  paperFinish = "MATTE",
  cornerStyle = "SQUARE",
  companyInfo,
  className = "",
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const qrMatrix = usePermanentQrMatrix();
  const [targetFlipY, setTargetFlipY] = useState(0);
  const [autoRotate, setAutoRotate] = useState(false);
  const [showingSide, setShowingSide] = useState<"FRONT" | "BACK">("FRONT");
  const [loadedImages, setLoadedImages] = useState<
    Map<string, HTMLImageElement>
  >(new Map());

  const rotRef = useRef({ x: 0.12, y: -0.22 });
  const isDraggingRef = useRef(false);
  const prevMouseRef = useRef({ x: 0, y: 0 });
  const targetFlipRef = useRef(0);
  const autoRotateRef = useRef(false);

  targetFlipRef.current = targetFlipY;
  autoRotateRef.current = autoRotate;

  // Preload any imageUrl on front or back elements and background images for 3D canvas texture painting
  useEffect(() => {
    const urls = new Set<string>();
    if (frontBg.backgroundImageUrl) urls.add(frontBg.backgroundImageUrl);
    if (backBg.backgroundImageUrl) urls.add(backBg.backgroundImageUrl);
    [...frontElements, ...backElements].forEach((el) => {
      if (el.imageUrl) urls.add(el.imageUrl);
    });
    if (urls.size === 0) return;

    let active = true;
    const map = new Map<string, HTMLImageElement>();
    let remaining = urls.size;

    urls.forEach((u) => {
      const img = new window.Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        map.set(u, img);
        remaining -= 1;
        if (remaining === 0 && active) {
          setLoadedImages(new Map(map));
        }
      };
      img.onerror = () => {
        remaining -= 1;
        if (remaining === 0 && active) {
          setLoadedImages(new Map(map));
        }
      };
      img.src = u;
    });

    return () => {
      active = false;
    };
  }, [frontBg.backgroundImageUrl, backBg.backgroundImageUrl, frontElements, backElements]);

  const handleFlip = useCallback(() => {
    setTargetFlipY((prev) => {
      const next = prev === 0 ? Math.PI : 0;
      setShowingSide(next === 0 ? "FRONT" : "BACK");
      return next;
    });
  }, []);

  const handleResetView = useCallback(() => {
    rotRef.current = { x: 0.12, y: -0.22 };
    setTargetFlipY(0);
    setShowingSide("FRONT");
  }, []);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 560;
    const height = container.clientHeight || 360;

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(34, width / height, 0.1, 100);
    camera.position.set(0, 0.2, 6.6);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 1.35);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xfffbf0, 2.2);
    keyLight.position.set(4, 6, 5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xc9a96e, 1.1);
    rimLight.position.set(-5, -3, 3);
    scene.add(rimLight);

    const shadowPlaneGeo = new THREE.PlaneGeometry(12, 12);
    const shadowPlaneMat = new THREE.ShadowMaterial({ opacity: 0.24 });
    const shadowPlane = new THREE.Mesh(shadowPlaneGeo, shadowPlaneMat);
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = -1.45;
    shadowPlane.receiveShadow = true;
    scene.add(shadowPlane);

    const frontCanvas = paintCardSideToCanvas(
      widthMm,
      heightMm,
      frontBg,
      frontElements,
      paperFinish,
      companyInfo,
      loadedImages,
      qrMatrix
    );
    const backCanvas = paintCardSideToCanvas(
      widthMm,
      heightMm,
      isDoubleSided ? backBg : { type: "solid", primaryColor: "#FFFFFF" },
      isDoubleSided ? backElements : [],
      paperFinish,
      companyInfo,
      loadedImages,
      qrMatrix
    );

    const frontTex = new THREE.CanvasTexture(frontCanvas);
    frontTex.colorSpace = THREE.SRGBColorSpace;
    frontTex.anisotropy = 4;

    const backTex = new THREE.CanvasTexture(backCanvas);
    backTex.colorSpace = THREE.SRGBColorSpace;
    backTex.anisotropy = 4;

    const isGloss = paperFinish === "GLOSS";
    const isSoftTouch = paperFinish === "SOFT_TOUCH";
    const isTextured = paperFinish === "TEXTURED";

    const baseRoughness = isGloss
      ? 0.14
      : isSoftTouch
      ? 0.88
      : isTextured
      ? 0.82
      : 0.65;
    const baseClearcoat = isGloss ? 0.92 : isSoftTouch ? 0.05 : 0.12;

    const frontMat = new THREE.MeshPhysicalMaterial({
      map: frontTex,
      roughness: baseRoughness,
      metalness: isGloss ? 0.08 : 0.03,
      clearcoat: baseClearcoat,
      clearcoatRoughness: 0.1,
    });

    const backMat = new THREE.MeshPhysicalMaterial({
      map: backTex,
      roughness: baseRoughness,
      metalness: isGloss ? 0.08 : 0.03,
      clearcoat: baseClearcoat,
      clearcoatRoughness: 0.1,
    });

    const edgeMat = new THREE.MeshStandardMaterial({
      color: 0xc9a96e,
      roughness: 0.35,
      metalness: 0.5,
    });

    const cardW = 3.6;
    const cardH = (heightMm / widthMm) * cardW;
    const cardThickness = 0.035;

    const cardGroup = new THREE.Group();

    if (cornerStyle === "ROUNDED") {
      const r = 0.16;
      const shape = new THREE.Shape();
      const hw = cardW / 2;
      const hh = cardH / 2;
      shape.moveTo(-hw + r, -hh);
      shape.lineTo(hw - r, -hh);
      shape.quadraticCurveTo(hw, -hh, hw, -hh + r);
      shape.lineTo(hw, hh - r);
      shape.quadraticCurveTo(hw, hh, hw - r, hh);
      shape.lineTo(-hw + r, hh);
      shape.quadraticCurveTo(-hw, hh, -hw, hh - r);
      shape.lineTo(-hw, -hh + r);
      shape.quadraticCurveTo(-hw, -hh, -hw + r, -hh);

      const coreGeo = new THREE.ExtrudeGeometry(shape, {
        depth: cardThickness,
        bevelEnabled: false,
      });
      coreGeo.center();
      const coreMesh = new THREE.Mesh(coreGeo, edgeMat);
      coreMesh.castShadow = true;
      cardGroup.add(coreMesh);

      const faceGeo = new THREE.PlaneGeometry(cardW - 0.02, cardH - 0.02);
      const frontMesh = new THREE.Mesh(faceGeo, frontMat);
      frontMesh.position.z = cardThickness / 2 + 0.002;
      cardGroup.add(frontMesh);

      const backMesh = new THREE.Mesh(faceGeo, backMat);
      backMesh.rotation.y = Math.PI;
      backMesh.position.z = -cardThickness / 2 - 0.002;
      cardGroup.add(backMesh);
    } else {
      const boxGeo = new THREE.BoxGeometry(cardW, cardH, cardThickness);
      const materials = [
        edgeMat,
        edgeMat,
        edgeMat,
        edgeMat,
        frontMat,
        backMat,
      ];
      const boxMesh = new THREE.Mesh(boxGeo, materials);
      boxMesh.castShadow = true;
      cardGroup.add(boxMesh);
    }

    scene.add(cardGroup);

    let animId = 0;
    const animate = () => {
      animId = requestAnimationFrame(animate);

      if (autoRotateRef.current && !isDraggingRef.current) {
        rotRef.current.y += 0.008;
      }

      const desiredY = rotRef.current.y + targetFlipRef.current;
      cardGroup.rotation.y += (desiredY - cardGroup.rotation.y) * 0.12;
      cardGroup.rotation.x += (rotRef.current.x - cardGroup.rotation.x) * 0.12;

      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!container) return;
      const nw = container.clientWidth || 560;
      const nh = container.clientHeight || 360;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
      renderer.dispose();
    };
  }, [
    widthMm,
    heightMm,
    frontBg,
    backBg,
    frontElements,
    backElements,
    isDoubleSided,
    paperFinish,
    cornerStyle,
    companyInfo,
    loadedImages,
    qrMatrix,
  ]);

  return (
    <div
      className={`relative rounded-xl overflow-hidden bg-gradient-to-br from-forest-950 via-charcoal-900 to-forest-900 border border-gold/25 flex flex-col ${className}`}
    >
      <div className="flex items-center justify-between px-4 py-2.5 bg-forest-950/75 border-b border-gold/15 text-xs">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-gold" />
          <span className="font-semibold text-cream tracking-wide">
            LIVE 3D STUDIO INSPECTION
          </span>
          <span className="px-2 py-0.5 rounded bg-gold/15 text-gold border border-gold/30 font-mono text-[10px]">
            {paperFinish.replace("_", "-")} • {cornerStyle} CORNERS • {widthMm}×
            {heightMm}mm
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleFlip}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-gold text-forest-950 font-semibold hover:bg-gold-400 transition"
          >
            <FlipHorizontal className="w-3.5 h-3.5" />
            <span>
              Flip ({showingSide === "FRONT" ? "Show Back" : "Show Front"})
            </span>
          </button>
          <button
            type="button"
            onClick={() => setAutoRotate((v) => !v)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded border transition ${
              autoRotate
                ? "bg-emerald-900/60 border-emerald-400 text-emerald-200"
                : "bg-forest-900/60 border-gold/25 text-cream/80 hover:text-cream"
            }`}
          >
            {autoRotate ? (
              <Pause className="w-3.5 h-3.5" />
            ) : (
              <Play className="w-3.5 h-3.5" />
            )}
            <span>Turntable</span>
          </button>
          <button
            type="button"
            onClick={handleResetView}
            title="Reset 3D perspective"
            className="p-1.5 rounded bg-forest-900/60 border border-gold/25 text-cream/80 hover:text-gold transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div
        ref={mountRef}
        onMouseDown={(e) => {
          isDraggingRef.current = true;
          prevMouseRef.current = { x: e.clientX, y: e.clientY };
        }}
        onMouseMove={(e) => {
          if (!isDraggingRef.current) return;
          const dx = e.clientX - prevMouseRef.current.x;
          const dy = e.clientY - prevMouseRef.current.y;
          rotRef.current.y += dx * 0.01;
          rotRef.current.x = Math.max(
            -0.85,
            Math.min(0.85, rotRef.current.x + dy * 0.008)
          );
          prevMouseRef.current = { x: e.clientX, y: e.clientY };
        }}
        onMouseUp={() => {
          isDraggingRef.current = false;
        }}
        onMouseLeave={() => {
          isDraggingRef.current = false;
        }}
        className="w-full h-[350px] cursor-grab active:cursor-grabbing flex-1"
      />

      <div className="px-4 py-1.5 bg-forest-950/80 border-t border-gold/10 flex items-center justify-between text-[11px] text-cream/65">
        <span>
          Drag anywhere to rotate perspective in 3D • Realistic directional
          lighting &amp; shadows
        </span>
        <span className="text-gold font-mono">Viewing: {showingSide} SIDE</span>
      </div>
    </div>
  );
};

// components/game/PanoramaViewer.tsx
"use client";

import React, { Suspense, useRef, useState, useEffect } from "react";
import { Volume2, VolumeX, Volume1, Binoculars } from "lucide-react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { useTexture, Html } from "@react-three/drei";
import * as THREE from "three";
import { motion, AnimatePresence } from "framer-motion";
import { Hotspot, HOTSPOT_CONFIG, flatToSpherical } from "@/types/panorama";



// ── Générateur de miniature Cloudinary (chargement progressif) ──
// Transforme https://res.cloudinary.com/xx/image/upload/v123/fichier.png
// en https://res.cloudinary.com/xx/image/upload/w_800,q_60,f_auto/v123/fichier.png
// → image légère affichée immédiatement, la full se charge ensuite.
function cloudinaryThumb(url: string, maxW = 800): string {
  try {
    const marker = "/image/upload/";
    const idx = url.indexOf(marker);
    if (idx === -1) return url;
    return url.slice(0, idx + marker.length) + `w_${maxW},q_60,f_auto/` + url.slice(idx + marker.length);
  } catch {
    return url;
  }
}

// ── Sphère 360° ──
// ── Sphère 360° avec chargement progressif (miniature → full) ──
function PanoramaSphere({ url, onFullLoaded }: { url: string; onFullLoaded?: () => void }) {
  const [fullTexture, setFullTexture] = useState<THREE.Texture | null>(null);

  // Miniature légère : s'affiche quasi instantanément
  const thumbTexture = useTexture(cloudinaryThumb(url));
  thumbTexture.mapping = THREE.EquirectangularReflectionMapping;
  thumbTexture.colorSpace = THREE.SRGBColorSpace;

  // Full résolution : chargée en arrière-plan
  useEffect(() => {
    let cancelled = false;
    const loader = new THREE.TextureLoader();
    loader.load(
      url,
      (tex) => {
        tex.mapping = THREE.EquirectangularReflectionMapping;
        tex.colorSpace = THREE.SRGBColorSpace;
        if (!cancelled) {
          setFullTexture(tex);
          onFullLoaded?.();
        }
      },
      undefined,
      () => { onFullLoaded?.(); }, // même en erreur, on retire le loader
    );
    return () => { cancelled = true; };
  }, [url, onFullLoaded]);

  const texture = fullTexture || thumbTexture;

  return (
    <mesh scale={[-1, 1, 1]}>
      <sphereGeometry args={[5, 64, 32]} />
      <meshBasicMaterial map={texture} side={THREE.BackSide} />
    </mesh>
  );
}

// Composant qui envoie la rotation de caméra à useFrame
function CameraRotationTracker({ onRotationChange }: { onRotationChange: (rot: { x: number; y: number }) => void }) {
  const { camera } = useThree();

  useFrame(() => {
    const euler = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ');
    onRotationChange({ x: euler.x, y: euler.y });
  });

  return null;
}

// ── Effet de Zoom dynamique lors d'une transition ──
function TransitionEffect({ isTransitioning }: { isTransitioning: boolean }) {
  const { camera } = useThree();

  useFrame((state, delta) => {
    const perspectiveCamera = camera as THREE.PerspectiveCamera;
    if (isTransitioning) {
      // Réduit le FOV brutalement pour simuler un "zoom en avant" Street View
      perspectiveCamera.fov = THREE.MathUtils.lerp(perspectiveCamera.fov, 25, delta * 5);
      perspectiveCamera.updateProjectionMatrix();
    }
  });

  return null;
}

// ── Contrôles de rotation ET DE ZOOM (Améliorés pour éviter le tournis) ──
function DragAndZoomControls({
  isTransitioning,
  joystickDeltaRef,
}: {
  isTransitioning: boolean;
  joystickDeltaRef: React.MutableRefObject<{ x: number; y: number }>;
}) {
  const { camera, gl } = useThree();
  const isDragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const rotationRef = useRef({ x: 0, y: 0 });
  const velocityRef = useRef({ x: 0, y: 0 });

  // ── Touches clavier maintenues ──
  const keysRef = useRef<Record<string, boolean>>({});

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Ne rien faire si un input/textarea a le focus
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      keysRef.current[e.key] = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.key] = false;
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  useEffect(() => {
    const canvas = gl.domElement;

    const onWheel = (e: WheelEvent) => {
      if (isTransitioning) return;
      e.preventDefault();
      const perspectiveCamera = camera as THREE.PerspectiveCamera;
      let newFov = perspectiveCamera.fov + e.deltaY * 0.05;
      newFov = Math.max(30, Math.min(100, newFov));
      perspectiveCamera.fov = newFov;
      perspectiveCamera.updateProjectionMatrix();
    };

    const onMouseDown = (e: MouseEvent) => {
      if (isTransitioning) return;
      isDragging.current = true;
      lastPos.current = { x: e.clientX, y: e.clientY };
      velocityRef.current = { x: 0, y: 0 };
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current || isTransitioning) return;
      const dx = e.clientX - lastPos.current.x;
      const dy = e.clientY - lastPos.current.y;
      velocityRef.current = { x: dx * 0.0015, y: dy * 0.0015 };
      rotationRef.current.x -= dx * 0.0015;
      rotationRef.current.y -= dy * 0.0015;
      rotationRef.current.y = Math.max(
        -Math.PI / 3,
        Math.min(Math.PI / 3, rotationRef.current.y)
      );
      lastPos.current = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => {
      isDragging.current = false;
    };

    const onTouchStart = (e: TouchEvent) => {
      if (isTransitioning) return;
      isDragging.current = true;
      lastPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!isDragging.current || isTransitioning) return;
      const dx = e.touches[0].clientX - lastPos.current.x;
      const dy = e.touches[0].clientY - lastPos.current.y;
      rotationRef.current.x -= dx * 0.0015;
      rotationRef.current.y -= dy * 0.0015;
      rotationRef.current.y = Math.max(
        -Math.PI / 3,
        Math.min(Math.PI / 3, rotationRef.current.y)
      );
      lastPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };

    canvas.addEventListener("wheel", onWheel, { passive: false });
    canvas.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    canvas.addEventListener("touchstart", onTouchStart, { passive: true });
    canvas.addEventListener("touchmove", onTouchMove, { passive: true });
    canvas.addEventListener("touchend", onMouseUp);

    return () => {
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("touchmove", onTouchMove);
      canvas.removeEventListener("touchend", onMouseUp);
    };
  }, [camera, gl, isTransitioning]);

  useFrame((_, delta) => {
    const perspectiveCamera = camera as THREE.PerspectiveCamera;
    const ROTATION_SPEED = 1.2;
    const ZOOM_SPEED = 40;

    // ── Joystick virtuel ──
    // ── Joystick virtuel ──
    const jx = joystickDeltaRef.current.x;
    const jy = joystickDeltaRef.current.y;
    if (Math.abs(jx) > 0.05) {
      rotationRef.current.x -= jx * ROTATION_SPEED * delta;
    }
    if (Math.abs(jy) > 0.05) {
      // ✅ Joystick vertical = rotation verticale (pitch)
      rotationRef.current.y += jy * ROTATION_SPEED * delta;
      rotationRef.current.y = Math.max(
        -Math.PI / 3,
        Math.min(Math.PI / 3, rotationRef.current.y)
      );
    }

    // ── Clavier ──
    if (!isTransitioning) {
      const keys = keysRef.current;

      // Rotation horizontale
      if (keys["ArrowLeft"]) {
        rotationRef.current.x += ROTATION_SPEED * delta;
      }
      if (keys["ArrowRight"]) {
        rotationRef.current.x -= ROTATION_SPEED * delta;
      }

      // Rotation verticale (haut/bas)
      if (keys["ArrowUp"]) {
        rotationRef.current.y += ROTATION_SPEED * delta;
        rotationRef.current.y = Math.max(
          -Math.PI / 3,
          Math.min(Math.PI / 3, rotationRef.current.y)
        );
      }
      if (keys["ArrowDown"]) {
        rotationRef.current.y -= ROTATION_SPEED * delta;
        rotationRef.current.y = Math.max(
          -Math.PI / 3,
          Math.min(Math.PI / 3, rotationRef.current.y)
        );
      }

      // ✅ Zoom avec A (avancer) et R (reculer)
      if (keys["a"] || keys["A"]) {
        let newFov = perspectiveCamera.fov - ZOOM_SPEED * delta;
        newFov = Math.max(30, Math.min(100, newFov));
        perspectiveCamera.fov = newFov;
        perspectiveCamera.updateProjectionMatrix();
      }
      if (keys["r"] || keys["R"]) {
        let newFov = perspectiveCamera.fov + ZOOM_SPEED * delta;
        newFov = Math.max(30, Math.min(100, newFov));
        perspectiveCamera.fov = newFov;
        perspectiveCamera.updateProjectionMatrix();
      }
    }

    // ── Inertie drag ──
    if (!isDragging.current) {
      velocityRef.current.x *= 0.85;
      velocityRef.current.y *= 0.85;
      rotationRef.current.x -= velocityRef.current.x;
      rotationRef.current.y -= velocityRef.current.y;
    }

    camera.rotation.order = "YXZ";
    camera.rotation.y = rotationRef.current.x;
    camera.rotation.x = rotationRef.current.y;
  });

  return null;
}

function calculateHotspotProximity(cameraRotation: { x: number; y: number }, hotspotPosition: [number, number, number]): 'FAR' | 'CLOSE' | 'VERY_CLOSE' {
  const x = hotspotPosition[0]; const y = hotspotPosition[1]; const z = hotspotPosition[2];
  const magnitude = Math.sqrt(x * x + y * y + z * z);
  const normalizedX = x / magnitude; const normalizedY = y / magnitude; const normalizedZ = z / magnitude;

  const cameraX = Math.sin(cameraRotation.y) * Math.cos(cameraRotation.x);
  const cameraY = -Math.sin(cameraRotation.x);
  const cameraZ = Math.cos(cameraRotation.y) * Math.cos(cameraRotation.x);

  const dotProduct = normalizedX * cameraX + normalizedY * cameraY + normalizedZ * cameraZ;
  const angle = Math.acos(Math.max(-1, Math.min(1, dotProduct)));

  if (angle < 0.4) return 'VERY_CLOSE';
  if (angle < 0.8) return 'CLOSE';
  return 'FAR';
}

// ── Hotspot 3D ──
function HotspotMarker({
  hotspot, onActivate, solvedEnigmas, completedWordSearches, validatedConditions, lang, characters, proximityState, isTransitioning, scannerActive

}: any) {
  const { position } = flatToSpherical(hotspot.x_percent, hotspot.y_percent);
  const [hovered, setHovered] = useState(false);
  const config = HOTSPOT_CONFIG[hotspot.type] || { color: '#ffffff', icon: '❓' };
  const activeColor = hotspot.color || config.color;
  const isLocked = hotspot.condition
    ? !validatedConditions.includes(hotspot.condition)
    : false;
  const isTransition = hotspot.type === 'transition';



  // ✅ MODE DE DÉCOUVERTE : mapper vers invisible existant
  const discoverMode = hotspot.discover_mode || (hotspot.invisible ? "hidden" : "none");
  const isProximity = discoverMode === "proximity";
  const isScanner = discoverMode === "scanner";
  // Révélé si : visible, OU proximité proche, OU scanner actif
  const isRevealed =
    discoverMode === "none" ||
    (isProximity && proximityState === "VERY_CLOSE") ||
    (isScanner && scannerActive);
  // hidden = non révélé et pas un halo de proximité
  const effectivelyInvisible = !isRevealed && !(isProximity && proximityState === "CLOSE");
  // pour "hidden" et "proximity" non proche → quasi invisible
  const showMarker = isRevealed || isProximity; // proximité montre un léger halo même loin
  const state = isTransition ? (proximityState || 'FAR') : null;


  let characterAvatar: string | null = null;
  if (hotspot.type === 'character' && characters?.length) {
    const character = characters.find((c: any) => c.id === hotspot.character_id);
    if (character?.avatar_url) characterAvatar = character.avatar_url;
  }

  // ✅ LOGIQUE STREET VIEW : Calcul de l'angle pour coucher le chevron sur le sol
  const isGround = isTransition && hotspot.variant === 'ground';
  // Math.atan2 permet de trouver l'angle de rotation pour que la flèche pointe vers l'extérieur
  const angleY = Math.atan2(position[0], position[2]);

  // ── RENDU POUR CHEVRON AU SOL (STREET VIEW) ──
  if (isGround) {
    return (
      <Html
        position={position}
        center
        transform
        rotation={[-Math.PI / 2, 0, -angleY]}
        distanceFactor={6}
      >
        {effectivelyInvisible ? (
          /* ── INVISIBLE : zone cliquable transparente uniquement ── */
          <div data-hotspot-marker="true"
            className={`relative w-20 h-20 rounded-full cursor-pointer transition-all duration-300 ${isTransitioning ? 'pointer-events-none opacity-0' : 'opacity-0 hover:opacity-10'}`}
            style={{ backgroundColor: activeColor }}
            onClick={() => !isLocked && !isTransitioning && onActivate(hotspot)}
          />
        ) : (
          /* ── VISIBLE : rendu normal ── */
          <div data-hotspot-marker="true"
            className={`relative w-20 h-20 rounded-full flex items-center justify-center cursor-pointer transition-all duration-300 ${isTransitioning ? 'pointer-events-none opacity-0 scale-50' : 'opacity-70 hover:opacity-100 scale-100 hover:scale-110'}`}
            onClick={() => !isLocked && !isTransitioning && onActivate(hotspot)}
          >
            <div
              className="w-10 h-10 border-t-8 border-l-8 rotate-45 transform origin-center shadow-2xl -mt-4"
              style={{ borderColor: 'white', filter: `drop-shadow(0px 0px 8px ${activeColor})` }}
            />
            <div
              className="absolute inset-0 rounded-full border-4 animate-ping opacity-20 pointer-events-none"
              style={{ borderColor: activeColor }}
            />
          </div>
        )}
      </Html>
    );
  }

  // ── RENDU POUR HOTSPOT FLOTTANT CLASSIQUE (Face Caméra) ──
  return (
    <Html position={position} center distanceFactor={8}>
      {effectivelyInvisible ? (
        /* ── INVISIBLE : zone cliquable transparente + tooltip au hover ── */
        <div data-hotspot-marker="true"
          className={`relative select-none w-16 h-16 rounded-full ${isTransitioning ? 'pointer-events-none opacity-0' : 'cursor-pointer opacity-0 hover:opacity-10 transition-opacity duration-300'}`}
          style={{ backgroundColor: activeColor }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onClick={() => !isLocked && !isTransitioning && onActivate(hotspot)}
        >
          {/* Tooltip au hover même en mode invisible (facultatif mais utile) */}
          <AnimatePresence>
            {hovered && !isTransitioning && (
              <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }} className="absolute left-1/2 -translate-x-1/2 bottom-full mb-3 whitespace-nowrap pointer-events-none">
                <div className="px-3 py-1.5 rounded-lg text-white text-xs font-bold shadow-2xl" style={{ backgroundColor: activeColor }}>
                  {lang === 'fr' ? hotspot.label_fr : hotspot.label_en}
                </div>
                <div className="w-2 h-2 mx-auto -mt-1 rotate-45" style={{ backgroundColor: activeColor }} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : (
        /* ── VISIBLE : rendu normal ── */
        <div data-hotspot-marker="true"
          className={`relative select-none ${isTransitioning ? 'pointer-events-none opacity-0' : 'cursor-pointer transition-opacity duration-300'}`}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onClick={() => !isLocked && !isTransitioning && onActivate(hotspot)}
        >
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-200 overflow-hidden ${state === 'VERY_CLOSE' ? 'scale-150 opacity-100' :
              state === 'CLOSE' ? 'scale-125 opacity-75 animate-pulse' :
                state === 'FAR' ? 'scale-100 opacity-40' :
                  isLocked ? 'opacity-50 grayscale' : 'hover:scale-125'
              }`}
            style={{
              backgroundColor: activeColor + '33',
              borderColor: isLocked ? '#6b7280' : activeColor,
              boxShadow: hovered && !isLocked ? `0 0 20px ${activeColor}66` :
                state === 'VERY_CLOSE' ? `0 0 30px ${activeColor}99` :
                  state === 'CLOSE' ? `0 0 15px ${activeColor}66` : 'none',
            }}
          >
            {characterAvatar && !isLocked ? (
              <img src={characterAvatar} alt="" className="w-full h-full object-cover select-none" draggable={false} />
            ) : hotspot.icon_url && !isLocked ? (
              <img src={hotspot.icon_url} alt="" className="w-full h-full object-cover select-none" draggable={false} />
            ) : (
              <span className="text-xl">{isLocked ? '🔒' : (hotspot.icon || config.icon)}</span>
            )}
          </div>

          {!isLocked && <div className="absolute inset-0 rounded-full opacity-30 animate-ping" style={{ backgroundColor: activeColor }} />}

          <AnimatePresence>
            {state === 'VERY_CLOSE' && isTransition && !isTransitioning && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute left-1/2 -translate-x-1/2 bottom-full mb-4 whitespace-nowrap">
                <div className="px-4 py-2 bg-green-500/20 border border-green-500 rounded-lg text-white text-xs font-bold shadow-2xl">
                  {lang === 'fr' ? '→ Avancez' : '→ Move forward'}
                </div>
              </motion.div>
            )}

            {hovered && !isTransitioning && (
              <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }} className="absolute left-1/2 -translate-x-1/2 bottom-full mb-3 whitespace-nowrap">
                <div className="px-3 py-1.5 rounded-lg text-white text-xs font-bold shadow-2xl" style={{ backgroundColor: isLocked ? '#374151' : activeColor }}>
                  {isLocked ? (lang === 'fr' ? 'Résolvez l\'énigme d\'abord' : 'Solve the enigma first') : (lang === 'fr' ? hotspot.label_fr : hotspot.label_en)}
                </div>
                <div className="w-2 h-2 mx-auto -mt-1 rotate-45" style={{ backgroundColor: isLocked ? '#374151' : activeColor }} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </Html>
  );
}
interface PanoramaViewerProps {
  panoramaUrl: string;
  hotspots: Hotspot[];
  evidences: any[];
  solvedEnigmas: string[];
  completedWordSearches?: string[];
  validatedConditions?: string[];
  lang?: 'fr' | 'en';
  onHotspotActivate: (hotspot: Hotspot, evidence?: any) => void;
  onTransition?: (chapterId: string) => void;
  onSceneChange?: (sceneId: string) => void; // ✅ NOUVEAU
  onSceneTap?: () => void; // ✅ NOUVEAU : tap propre sur la scène (hors hotspot/UI)
  ambientAudioUrl?: string | null;
  isDialogueOpen?: boolean;   // ✅ baisse l'ambiance pendant un dialogue
  ambientAudioVolume?: number;
  visualFilter?: string;
  isEditorPreview?: boolean;
  characters?: any[];

}


// ── Joystick Virtuel ──
function VirtualJoystick({
  onDelta,
  isVisible,
  onToggle,
}: {
  onDelta: (x: number, y: number) => void;
  isVisible: boolean;
  onToggle: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef(false);
  const originRef = useRef({ x: 0, y: 0 });
  const MAX_DIST = 40;

  const getPos = (e: MouseEvent | { clientX: number; clientY: number }) => ({
    x: e.clientX,
    y: e.clientY
  });

  const onStart = (pos: { x: number; y: number }) => {
    activeRef.current = true;
    originRef.current = pos;
  };

  const onMove = (pos: { x: number; y: number }) => {
    if (!activeRef.current || !knobRef.current) return;
    let dx = pos.x - originRef.current.x;
    let dy = pos.y - originRef.current.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > MAX_DIST) {
      dx = (dx / dist) * MAX_DIST;
      dy = (dy / dist) * MAX_DIST;
    }
    knobRef.current.style.transform = `translate(${dx}px, ${dy}px)`;
    // Normaliser entre -1 et 1
    onDelta(dx / MAX_DIST, dy / MAX_DIST);
  };

  const onEnd = () => {
    activeRef.current = false;
    if (knobRef.current) {
      knobRef.current.style.transform = `translate(0px, 0px)`;
    }
    onDelta(0, 0);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => onMove(getPos(e));
    const handleMouseUp = () => onEnd();
    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      onMove(getPos(e.touches[0]));
    };
    const handleTouchEnd = () => onEnd();

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, []);

  return (
    <div className="absolute bottom-24 left-4 z-50 flex flex-col items-center gap-2" data-ui-block="true">
      {/* Bouton toggle */}
      <button
        onClick={onToggle}
        className="w-7 h-7 rounded-full bg-black/60 border border-white/20 text-white text-[10px] font-bold flex items-center justify-center hover:bg-black/80 transition-all"
        title={isVisible ? "Masquer joystick" : "Afficher joystick"}
      >
        {isVisible ? "✕" : "🕹️"}
      </button>

      {/* Joystick */}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.15 }}
          >
            <div
              ref={containerRef}
              className="relative w-24 h-24 rounded-full bg-black/40 border-2 border-white/20 backdrop-blur-md flex items-center justify-center select-none"
              style={{ touchAction: "none" }}
              onMouseDown={(e) => onStart(getPos(e.nativeEvent))}
              onTouchStart={(e) => {
                e.preventDefault();
                onStart(getPos(e.touches[0]));
              }}
            >
              {/* Croix indicative */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-30">
                <div className="absolute top-2 left-1/2 -translate-x-1/2 text-white text-[10px]">▲</div>
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-white text-[10px]">▼</div>
                <div className="absolute left-2 top-1/2 -translate-y-1/2 text-white text-[10px]">◀</div>
                <div className="absolute right-2 top-1/2 -translate-y-1/2 text-white text-[10px]">▶</div>
              </div>

              {/* Knob */}
              <div
                ref={knobRef}
                className="w-10 h-10 rounded-full bg-white/20 border-2 border-white/50 backdrop-blur-sm transition-transform duration-75 cursor-grab active:cursor-grabbing"
                style={{ willChange: "transform" }}
              />
            </div>

            {/* Légende */}
            {/* Légende */}
            <p className="text-[9px] text-white/30 text-center mt-1 font-mono">
              ↕ haut/bas · ↔ rotation · A/R zoom
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function PanoramaViewer({
  panoramaUrl, hotspots, evidences, solvedEnigmas, completedWordSearches = [], validatedConditions = [], lang = 'fr',
  onHotspotActivate, onTransition, onSceneChange, onSceneTap,
  ambientAudioUrl, ambientAudioVolume = 0.5, visualFilter = 'none', isEditorPreview = false, characters = [], isDialogueOpen = false,
}: PanoramaViewerProps) {

  const [proximities, setProximities] = useState<Record<string, 'FAR' | 'CLOSE' | 'VERY_CLOSE'>>({});
  const [isTransitioning, setIsTransitioning] = useState(false);

  const [scannerActive, setScannerActive] = useState(false);

  const [scannerCooldown, setScannerCooldown] = useState(false);



  // ── Détection d'un "tap propre" sur la scène (hors hotspot/UI) ──
  const [panoramaReady, setPanoramaReady] = useState(false);

  useEffect(() => {
    setPanoramaReady(false);
  }, [panoramaUrl]);
  // Desktop : 1 clic net déclenche le callback. Mobile : double-tap requis.
  const tapStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const lastTapRef = useRef<{ x: number; y: number; time: number } | null>(null);

  const handleScenePointerDown = (e: React.PointerEvent) => {
    tapStartRef.current = { x: e.clientX, y: e.clientY, time: Date.now() };
  };

  const handleScenePointerUp = (e: React.PointerEvent) => {
    const start = tapStartRef.current;
    tapStartRef.current = null;
    if (!start || !onSceneTap) return;

    const dist = Math.hypot(e.clientX - start.x, e.clientY - start.y);
    const duration = Date.now() - start.time;
    // Si mouvement trop grand ou trop long → c'était un drag (rotation caméra), pas un tap
    if (dist > 10 || duration > 400) return;

    const target = e.target as HTMLElement;
    // On ignore les clics sur un hotspot ou un élément d'UI interne (volume, etc.)
    if (target.closest('[data-hotspot-marker]') || target.closest('[data-ui-block]')) return;

    if (e.pointerType === 'touch') {
      const now = Date.now();
      const last = lastTapRef.current;
      if (last && now - last.time < 350 && Math.hypot(e.clientX - last.x, e.clientY - last.y) < 40) {
        lastTapRef.current = null;
        onSceneTap();
      } else {
        lastTapRef.current = { x: e.clientX, y: e.clientY, time: now };
      }
    } else {
      onSceneTap();
    }
  };

  // ✅ NOUVEAU : Gestion audio avancée
  const audioRef = useRef<HTMLAudioElement>(null);
  const [userVolume, setUserVolume] = useState<number>(() => {
    // Charge le volume préféré du joueur depuis le localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('lukeni_audio_volume');
      return saved ? parseFloat(saved) : 1; // 1 = 100% du volume de la scène
    }
    return 1;
  });
  const [isMuted, setIsMuted] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('lukeni_audio_muted') === 'true';
    }
    return false;
  });
  const [showVolumePanel, setShowVolumePanel] = useState(false);
  const [audioBlocked, setAudioBlocked] = useState(false);

  // États joystick
  const [joystickVisible, setJoystickVisible] = useState(true);
  const joystickDeltaRef = useRef({ x: 0, y: 0 });

  // ✅ Gestion du volume effectif (combinaison admin + user)
  // ✅ Gestion du volume effectif et du mute en temps réel
  useEffect(() => {
    if (audioRef.current) {
      if (isMuted) {
        audioRef.current.pause(); // ✅ Coupe la lecture si muté
      } else {
        const duckFactor = isDialogueOpen ? 0.3 : 1;   // ✅ baisse à 30% pendant dialogue
        const finalVolume = ambientAudioVolume * userVolume * duckFactor;
        audioRef.current.volume = Math.max(0, Math.min(1, finalVolume));
        // ✅ Reprend la lecture si unmute
        if (audioRef.current.paused && ambientAudioUrl) {
          audioRef.current.play().catch(() => { });
        }
      }
    }
  }, [ambientAudioVolume, userVolume, isMuted, ambientAudioUrl, isDialogueOpen]);

  // ✅ Sauvegarder les préférences du joueur
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('lukeni_audio_volume', userVolume.toString());
      localStorage.setItem('lukeni_audio_muted', isMuted.toString());
    }
  }, [userVolume, isMuted]);

  // ✅ COUPURE PROPRE entre les scènes : Fade out → change → fade in
  // ✅ COUPURE PROPRE entre les scènes : Fade out → change → fade in
  useEffect(() => {
    setIsTransitioning(false);
    const audioEl = audioRef.current;

    let fadeInInterval: NodeJS.Timeout | null = null;

    if (audioEl && ambientAudioUrl) {
      if (isMuted) {
        // ✅ Si muté, on s'assure que l'audio est en pause
        audioEl.pause();
      } else {
        // ✅ Sinon, on lance la lecture avec un fade-in
        audioEl.volume = 0;

        audioEl.play().catch((err) => {
          console.warn("🔇 Autoplay bloqué par le navigateur.");
          setAudioBlocked(true);
        });

        fadeInInterval = setInterval(() => {
          const target = ambientAudioVolume * userVolume * (isDialogueOpen ? 0.3 : 1);
          if (audioEl.volume < target - 0.05) {
            audioEl.volume = Math.min(target, audioEl.volume + 0.05);
          } else {
            audioEl.volume = target;
            if (fadeInInterval) clearInterval(fadeInInterval);
          }
        }, 80);
      }
    }

    // ✅ NETTOYAGE : Stopper l'audio à la fermeture/scene change
    // ✅ NETTOYAGE : Stopper l'audio à la fermeture/scene change
    // avec un FADE-OUT progressif pour éviter le "couic" net
    return () => {
      if (fadeInInterval) clearInterval(fadeInInterval);
      if (audioEl) {
        // ✅ Fade-out rapide (~300ms) puis coupure propre
        const startVol = audioEl.volume;
        const fadeSteps = 8; // ~8 étapes de ~37ms
        let step = 0;
        const fadeOut = setInterval(() => {
          step++;
          const progress = 1 - step / fadeSteps;
          audioEl.volume = Math.max(0, startVol * progress);
          if (step >= fadeSteps) {
            clearInterval(fadeOut);
            audioEl.pause();
            audioEl.currentTime = 0;
            audioEl.src = '';
            audioEl.load();
            console.log('🔇 [PANORAMA] Audio stoppé et nettoyé');
          }
        }, 37);
      }
    };
    }, [panoramaUrl, ambientAudioUrl, ambientAudioVolume, userVolume, isMuted, isDialogueOpen]);

  // 🔊 AUDIO DE PROXIMITÉ : gère les audios des hotspots selon la proximité
  const hotspotAudioRefs = useRef<Record<string, HTMLAudioElement>>({});
  useEffect(() => {
    // Nettoyer les audios des hotspots précédents
    Object.values(hotspotAudioRefs.current).forEach(a => { a.pause(); a.currentTime = 0; });
    hotspotAudioRefs.current = {};

    const audioHotspots = hotspots.filter(h => h.ambient_hotspot_audio_url);
    audioHotspots.forEach(h => {
      const audio = new Audio(h.ambient_hotspot_audio_url!);
      audio.loop = true;
      audio.volume = 0;
      audio.muted = isMuted;
      audio.play().catch(() => { });
      hotspotAudioRefs.current[h.id] = audio;
    });

    return () => {
      Object.values(hotspotAudioRefs.current).forEach(a => a.pause());
      hotspotAudioRefs.current = {};
    };
  }, [panoramaUrl, hotspots, isMuted]);

  // Ajuster le volume selon la proximité
  useEffect(() => {
    Object.entries(proximities).forEach(([id, state]) => {
      const audio = hotspotAudioRefs.current[id];
      const hotspot = hotspots.find(h => h.id === id);
      if (!audio || !hotspot?.ambient_hotspot_audio_volume) return;
      const baseVol = hotspot.ambient_hotspot_audio_volume ?? 0.5;
      // FAR = silencieux, CLOSE = 60% du volume, VERY_CLOSE = 100%
      const target = state === "VERY_CLOSE" ? baseVol : state === "CLOSE" ? baseVol * 0.6 : 0;
      // transition douce
      audio.volume = Math.max(0, Math.min(1, target));
      audio.muted = isMuted;
    });
  }, [proximities, hotspots, isMuted]);

  const handleHotspotActivate = (hotspot: Hotspot) => {
    if (hotspot.type === 'transition') {
      // 1. Transition vers un autre CHAPITRE
      if (hotspot.target_chapter_id) {
        onTransition?.(hotspot.target_chapter_id);
        return;
      }
      // 2. Transition vers une autre SCÈNE
      if (hotspot.target_scene_id) {
        setIsTransitioning(true); // Déclenche le zoom + fondu au noir
        setTimeout(() => {
          onSceneChange?.(hotspot.target_scene_id!);
        }, 600); // Laisse 600ms à l'effet CSS et 3D avant de changer l'image
        return; // ✅ TRÈS IMPORTANT : on s'arrête là, le modal ne s'ouvrira pas !
      }
    }

    // 3. Cas normal (Indice, PNJ, Info)
    const evidence = hotspot.evidence_id ? evidences.find(e => e.id === hotspot.evidence_id) : undefined;
    onHotspotActivate(hotspot, evidence);
  };

  const getFilterStyle = () => {
    switch (visualFilter) {
      case 'sepia': return 'sepia(80%) contrast(110%) brightness(90%)';
      case 'grayscale': return 'grayscale(100%) contrast(120%) brightness(85%)';
      case 'vintage': return 'sepia(40%) contrast(130%) saturate(120%) hue-rotate(90deg)';
      default: return 'none';
    }
  };

  // ✅ Fonction pour débloquer l'audio au premier clic/drag du joueur
  const handleUnlockAudio = () => {
    if (audioBlocked && audioRef.current && !isMuted) {
      audioRef.current.play().then(() => {
        setAudioBlocked(false); // Le son est débloqué !
      }).catch(() => { });
    }
  };

  return (
    <div
      className={isEditorPreview ? "relative w-full h-[500px] overflow-hidden rounded-xl bg-black" : "absolute inset-0 w-full h-full overflow-hidden bg-black"}
      onPointerDown={(e) => { handleUnlockAudio(); handleScenePointerDown(e); }}
      onPointerUp={handleScenePointerUp}
    >

      {/* ✅ Audio avec ref pour contrôler volume/mute */}
      {ambientAudioUrl && (
        <audio
          ref={audioRef}
          key={ambientAudioUrl}
          src={ambientAudioUrl}
          loop
          playsInline
          className="hidden"
        />
      )}

      {/* ✅ NOUVEAU : Contrôle Volume / Mute (Bouton flottant) */}
      {ambientAudioUrl && !isEditorPreview && (
        <div className="absolute top-4 right-4 z-50" data-ui-block="true">
          <div className="relative">
            <button
              onClick={() => setShowVolumePanel(!showVolumePanel)}
              onMouseEnter={() => setShowVolumePanel(true)}
              className="bg-black/70 backdrop-blur-md hover:bg-black/90 border border-white/20 rounded-full p-2.5 text-white transition-all shadow-xl"
              title={lang === 'fr' ? 'Contrôle audio' : 'Audio control'}
            >
              {isMuted || userVolume === 0 ? (
                <VolumeX size={16} className="text-red-400" />
              ) : userVolume < 0.5 ? (
                <Volume1 size={16} />
              ) : (
                <Volume2 size={16} />
              )}
            </button>

            <AnimatePresence>
              {showVolumePanel && (
                <motion.div
                  initial={{ opacity: 0, y: -5, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -5, scale: 0.95 }}
                  onMouseLeave={() => setShowVolumePanel(false)}
                  className="absolute top-full right-0 mt-2 bg-black/90 backdrop-blur-xl border border-white/20 rounded-xl p-4 shadow-2xl w-56"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-gray-400 font-mono uppercase tracking-wider">
                        {lang === 'fr' ? 'Ambiance' : 'Ambient'}
                      </span>
                      <span className="text-[10px] text-purple-400 font-mono font-bold">
                        {isMuted ? 'MUTE' : `${Math.round(userVolume * 100)}%`}
                      </span>
                    </div>

                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={userVolume}
                      onChange={(e) => {
                        setUserVolume(parseFloat(e.target.value));
                        if (isMuted && parseFloat(e.target.value) > 0) setIsMuted(false);
                      }}
                      className="w-full accent-purple-500 h-1 cursor-pointer"
                    />

                    <button
                      onClick={() => setIsMuted(!isMuted)}
                      className={`w-full py-1.5 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-1.5 ${isMuted
                        ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                        : 'bg-white/5 text-gray-300 border border-white/10 hover:bg-white/10'
                        }`}
                    >
                      {isMuted ? <VolumeX size={12} /> : <Volume2 size={12} />}
                      {isMuted
                        ? (lang === 'fr' ? 'Activer le son' : 'Unmute')
                        : (lang === 'fr' ? 'Couper le son' : 'Mute')
                      }
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}




      {/* 🔭 BOUTON SCANNER (flash 3s) - au-dessus du joystick */}
      {!isEditorPreview && (
        <button
          onClick={() => {
            if (scannerCooldown) return;
            setScannerActive(true);
            setTimeout(() => setScannerActive(false), 3000);
            setScannerCooldown(true);
            setTimeout(() => setScannerCooldown(false), 5000);
          }}
          className={`absolute bottom-56 left-5 z-50 w-11 h-11 rounded-full flex items-center justify-center border transition-colors ${scannerActive ? "bg-[#06b6d4] text-black border-[#06b6d4] animate-pulse" : "bg-black/60 text-white border-white/20 hover:bg-black/80"}`}
          title={lang === "fr" ? "Scanner la zone" : "Scan the area"}
        >
          <Binoculars size={20} />
        </button>
      )}
      {scannerActive && (
        <div className="absolute bottom-44 left-20 z-40 px-3 py-1.5 bg-[#06b6d4]/90 text-black rounded-full text-[10px] font-bold font-mono whitespace-nowrap">
          {lang === "fr" ? "SCANNER..." : "SCANNING..."}
        </div>
      )}
      {scannerCooldown && !scannerActive && (
        <div className="absolute bottom-44 left-20 z-40 px-3 py-1.5 bg-black/80 text-gray-400 rounded-full text-[10px] font-bold font-mono whitespace-nowrap">
          {lang === "fr" ? "Recharge..." : "Recharging..."}
        </div>
      )}
      {scannerActive && (
        <div className="absolute top-16 left-4 z-40 px-3 py-1.5 bg-[#06b6d4]/90 text-black rounded-full text-[10px] font-bold font-mono">
          {lang === "fr" ? "SCANNER..." : "SCANNING..."}
        </div>
      )}
      {scannerCooldown && !scannerActive && (
        <div className="absolute top-16 left-4 z-40 px-3 py-1.5 bg-black/80 text-gray-400 rounded-full text-[10px] font-bold font-mono">
          {lang === "fr" ? "Recharge..." : "Recharging..."}
        </div>
      )}


      {/* ✅ Joystick Virtuel */}
      {!isEditorPreview && (
        <VirtualJoystick
          onDelta={(x, y) => {
            joystickDeltaRef.current = { x, y };
          }}
          isVisible={joystickVisible}
          onToggle={() => setJoystickVisible((v) => !v)}
        />
      )}

      {/* ✅ L'écran de fondu au noir pour la transition Street View */}
      {/* ✅ Écran de chargement progressif (remplace l'écran noir muet) */}
      <div
        className={`absolute inset-0 z-40 bg-black flex flex-col items-center justify-center gap-3 transition-opacity duration-500 pointer-events-none ${isTransitioning || !panoramaReady ? 'opacity-100' : 'opacity-0'}`}
      >
        <div className="w-10 h-10 border-2 border-[#D4AF37]/30 border-t-[#D4AF37] rounded-full animate-spin" />
        <p className="text-[#D4AF37] font-mono text-xs tracking-widest uppercase animate-pulse">
          {lang === 'fr' ? 'Chargement de la scène…' : 'Loading scene…'}
        </p>
      </div>

      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-black/60 backdrop-blur-sm px-4 py-2 rounded-full text-xs text-gray-300 pointer-events-none whitespace-nowrap">
        🖱️ {lang === 'fr' ? 'Cliquez et glissez pour explorer • Molette pour zoomer' : 'Click and drag to explore • Scroll to zoom'}
      </div>

      <div className="w-full h-full transition-all duration-1000" style={{ filter: getFilterStyle() }}>
        {/* On force le re-render du Canvas quand la photo change pour reset la caméra */}
        <Canvas key={panoramaUrl} camera={{ position: [0, 0, 0.1], fov: 90 }} gl={{ antialias: true }} style={{ background: '#000' }}>
          <Suspense fallback={null}>
            <PanoramaSphere
              url={panoramaUrl}
              onFullLoaded={() => setPanoramaReady(true)}
            />
            <CameraRotationTracker onRotationChange={(rot) => {
              const newProximities: Record<string, 'FAR' | 'CLOSE' | 'VERY_CLOSE'> = {};
              hotspots.forEach(h => {
                if (h.type === 'transition') {
                  const { position } = flatToSpherical(h.x_percent, h.y_percent);
                  newProximities[h.id] = calculateHotspotProximity(rot, position);
                }
              });
              setProximities(newProximities);
            }} />

            <TransitionEffect isTransitioning={isTransitioning} />
            <DragAndZoomControls
              isTransitioning={isTransitioning}
              joystickDeltaRef={joystickDeltaRef}
            />

            {hotspots.map(hotspot => (
              <HotspotMarker
                key={hotspot.id}
                hotspot={hotspot}
                onActivate={handleHotspotActivate}
                solvedEnigmas={solvedEnigmas}
                completedWordSearches={completedWordSearches || []}
                validatedConditions={validatedConditions}
                lang={lang}
                characters={characters}
                proximityState={proximities[hotspot.id]}
                isTransitioning={isTransitioning}
                scannerActive={scannerActive}
              />
            ))}
          </Suspense>
        </Canvas>
      </div>
    </div>
  );
}
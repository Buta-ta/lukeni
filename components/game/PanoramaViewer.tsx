// components/game/PanoramaViewer.tsx
"use client";

import React, { Suspense, useRef, useState, useEffect } from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { useTexture, Html } from "@react-three/drei";
import * as THREE from "three";
import { motion, AnimatePresence } from "framer-motion";
import { Hotspot, HOTSPOT_CONFIG, flatToSpherical } from "@/types/panorama";

// ── Sphère 360° ──
function PanoramaSphere({ url }: { url: string }) {
  const texture = useTexture(url);
  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.colorSpace = THREE.SRGBColorSpace;

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
function DragAndZoomControls({ isTransitioning }: { isTransitioning: boolean }) {
  const { camera, gl } = useThree();
  const isDragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const rotationRef = useRef({ x: 0, y: 0 });
  const velocityRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = gl.domElement;

    const onWheel = (e: WheelEvent) => {
      if (isTransitioning) return;
      e.preventDefault();
      const perspectiveCamera = camera as THREE.PerspectiveCamera;
      let newFov = perspectiveCamera.fov + (e.deltaY * 0.05);
      newFov = Math.max(30, Math.min(100, newFov)); // Limites du zoom optique
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
      
      // ✅ ANTI-TOURNIS : Sensibilité réduite (0.0015 au lieu de 0.003)
      velocityRef.current = { x: dx * 0.0015, y: dy * 0.0015 };
      rotationRef.current.x -= dx * 0.0015;
      rotationRef.current.y -= dy * 0.0015;
      
      // ✅ ANTI-TOURNIS : Angle vertical (pitch) strictement bloqué (évite de faire des loopings)
      rotationRef.current.y = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, rotationRef.current.y));
      
      lastPos.current = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => { isDragging.current = false; };

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
      rotationRef.current.y = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, rotationRef.current.y));
      
      lastPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };

    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('touchstart', onTouchStart, { passive: true });
    canvas.addEventListener('touchmove', onTouchMove, { passive: true });
    canvas.addEventListener('touchend', onMouseUp);

    return () => {
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchend', onMouseUp);
    };
  }, [camera, gl, isTransitioning]);

  useFrame(() => {
    if (!isDragging.current) {
      // ✅ ANTI-TOURNIS : Plus de friction (0.85 au lieu de 0.92) -> s'arrête plus vite
      velocityRef.current.x *= 0.85;
      velocityRef.current.y *= 0.85;
      rotationRef.current.x -= velocityRef.current.x;
      rotationRef.current.y -= velocityRef.current.y;
    }

    camera.rotation.order = 'YXZ';
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
  hotspot, onActivate, solvedEnigmas, lang, characters, proximityState, isTransitioning
}: any) {
  const { position } = flatToSpherical(hotspot.x_percent, hotspot.y_percent);
  const [hovered, setHovered] = useState(false);
  const config = HOTSPOT_CONFIG[hotspot.type] || { color: '#ffffff', icon: '❓' };
  const activeColor = hotspot.color || config.color;
  const isLocked = hotspot.condition ? !solvedEnigmas.includes(hotspot.condition) : false;
  const isTransition = hotspot.type === 'transition';
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
        {hotspot.invisible ? (
          /* ── INVISIBLE : zone cliquable transparente uniquement ── */
          <div
            className={`relative w-20 h-20 rounded-full cursor-pointer transition-all duration-300 ${isTransitioning ? 'pointer-events-none opacity-0' : 'opacity-0 hover:opacity-10'}`}
            style={{ backgroundColor: activeColor }}
            onClick={() => !isLocked && !isTransitioning && onActivate(hotspot)}
          />
        ) : (
          /* ── VISIBLE : rendu normal ── */
          <div
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
      {hotspot.invisible ? (
        /* ── INVISIBLE : zone cliquable transparente + tooltip au hover ── */
        <div
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
        <div
          className={`relative select-none ${isTransitioning ? 'pointer-events-none opacity-0' : 'cursor-pointer transition-opacity duration-300'}`}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onClick={() => !isLocked && !isTransitioning && onActivate(hotspot)}
        >
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-200 overflow-hidden ${
              state === 'VERY_CLOSE' ? 'scale-150 opacity-100' :
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
  lang?: 'fr' | 'en';
  onHotspotActivate: (hotspot: Hotspot, evidence?: any) => void;
  onTransition?: (chapterId: string) => void;
  onSceneChange?: (sceneId: string) => void; // ✅ NOUVEAU
  ambientAudioUrl?: string | null;
  visualFilter?: string;
  isEditorPreview?: boolean;
  characters?: any[];
}

export default function PanoramaViewer({
  panoramaUrl, hotspots, evidences, solvedEnigmas, lang = 'fr',
  onHotspotActivate, onTransition, onSceneChange,
  ambientAudioUrl, visualFilter = 'none', isEditorPreview = false, characters = [],
}: PanoramaViewerProps) {
  
  const [proximities, setProximities] = useState<Record<string, 'FAR' | 'CLOSE' | 'VERY_CLOSE'>>({});
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Remise à zéro quand l'image change (fin de la transition)
  useEffect(() => {
    setIsTransitioning(false);
  }, [panoramaUrl]);

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

  return (
    <div className={isEditorPreview ? "relative w-full h-[500px] overflow-hidden rounded-xl bg-black" : "absolute inset-0 w-full h-full overflow-hidden bg-black"}>

      {ambientAudioUrl && <audio src={ambientAudioUrl} autoPlay loop playsInline className="hidden" />}

      {/* ✅ L'écran de fondu au noir pour la transition Street View */}
      <div 
        className={`absolute inset-0 z-40 bg-black transition-opacity duration-500 pointer-events-none ${isTransitioning ? 'opacity-100' : 'opacity-0'}`}
      />

      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-black/60 backdrop-blur-sm px-4 py-2 rounded-full text-xs text-gray-300 pointer-events-none whitespace-nowrap">
        🖱️ {lang === 'fr' ? 'Cliquez et glissez pour explorer • Molette pour zoomer' : 'Click and drag to explore • Scroll to zoom'}
      </div>

      <div className="w-full h-full transition-all duration-1000" style={{ filter: getFilterStyle() }}>
        {/* On force le re-render du Canvas quand la photo change pour reset la caméra */}
        <Canvas key={panoramaUrl} camera={{ position: [0, 0, 0.1], fov: 75 }} gl={{ antialias: true }} style={{ background: '#000' }}>
          <Suspense fallback={null}>
            <PanoramaSphere url={panoramaUrl} />
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
            <DragAndZoomControls isTransitioning={isTransitioning} />

            {hotspots.map(hotspot => (
              <HotspotMarker
                key={hotspot.id}
                hotspot={hotspot}
                onActivate={handleHotspotActivate}
                solvedEnigmas={solvedEnigmas}
                lang={lang}
                characters={characters}
                proximityState={proximities[hotspot.id]}
                isTransitioning={isTransitioning}
              />
            ))}
          </Suspense>
        </Canvas>
      </div>
    </div>
  );
}
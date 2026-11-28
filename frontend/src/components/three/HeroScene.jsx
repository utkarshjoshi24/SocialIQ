import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Stitch palette
const CYAN = new THREE.Color('#22D3EE');
const VIOLET = new THREE.Color('#A78BFA');
const OUTLINE = '#2B303B';
const SURFACE = '#111318';

const COLS = 9; // posting days
const ROWS = 5; // weeks
const SPACING = 0.62;

/**
 * Animated 3D bar chart: a 9×5 grid of bars whose heights ripple like a live
 * engagement heatmap. One InstancedMesh keeps it to a single draw call.
 */
function BarField({ animate }) {
  const mesh = useRef();
  const temp = useMemo(() => new THREE.Object3D(), []);
  const color = useMemo(() => new THREE.Color(), []);
  const count = COLS * ROWS;

  // Fixed pseudo-random phases so the pattern looks organic but is identical every load
  const phases = useMemo(
    () => Array.from({ length: count }, (_, i) => ((Math.sin(i * 12.9898) * 43758.5453) % 1) * Math.PI * 2),
    [count]
  );

  const layout = (t) => {
    let i = 0;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const wave = Math.sin(t * 0.9 + c * 0.55 + r * 0.35 + phases[i] * 0.25);
        const h = 0.35 + (wave * 0.5 + 0.5) * 1.6 + (c / COLS) * 0.6;
        temp.position.set((c - (COLS - 1) / 2) * SPACING, h / 2, (r - (ROWS - 1) / 2) * SPACING);
        temp.scale.set(1, h, 1);
        temp.updateMatrix();
        mesh.current.setMatrixAt(i, temp.matrix);
        color.copy(CYAN).lerp(VIOLET, Math.min(1, Math.max(0, (h - 0.35) / 2.2)));
        mesh.current.setColorAt(i, color);
        i++;
      }
    }
    mesh.current.instanceMatrix.needsUpdate = true;
    if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true;
  };

  useEffect(() => {
    if (mesh.current) layout(1.2);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useFrame(({ clock }) => {
    if (animate && mesh.current) layout(clock.elapsedTime);
  });

  return (
    <instancedMesh ref={mesh} args={[null, null, count]} castShadow>
      <boxGeometry args={[0.42, 1, 0.42]} />
      <meshStandardMaterial roughness={0.35} metalness={0.25} emissive="#0B2933" emissiveIntensity={0.6} />
    </instancedMesh>
  );
}

/** Dark base plate with grid lines under the chart. */
function BasePlate() {
  const width = COLS * SPACING + 0.6;
  const depth = ROWS * SPACING + 0.6;
  return (
    <group>
      <mesh position={[0, -0.06, 0]} receiveShadow>
        <boxGeometry args={[width, 0.12, depth]} />
        <meshStandardMaterial color={SURFACE} roughness={0.8} metalness={0.1} />
      </mesh>
      <gridHelper args={[Math.max(width, depth) + 2, 18, OUTLINE, OUTLINE]} position={[0, 0.001, 0]} />
    </group>
  );
}

/** Wireframe icosahedron "prediction core" with an orbit ring. */
function PredictionCore({ animate }) {
  const core = useRef();
  const ring = useRef();
  useFrame(({ clock }, delta) => {
    if (!animate) return;
    core.current.rotation.y += delta * 0.4;
    core.current.rotation.x += delta * 0.15;
    core.current.position.y = 3.05 + Math.sin(clock.elapsedTime * 1.1) * 0.12;
    ring.current.rotation.z += delta * 0.25;
  });
  return (
    <group position={[0.2, 0.3, -2.4]}>
      <mesh ref={core} position={[0, 3.05, 0]}>
        <icosahedronGeometry args={[0.55, 1]} />
        <meshStandardMaterial color="#67E8F9" emissive="#22D3EE" emissiveIntensity={0.9} wireframe />
      </mesh>
      <mesh ref={ring} position={[0, 3.05, 0]} rotation={[Math.PI / 2.4, 0, 0]}>
        <torusGeometry args={[0.95, 0.012, 8, 96]} />
        <meshBasicMaterial color={VIOLET} transparent opacity={0.8} />
      </mesh>
    </group>
  );
}

/** Slowly drifting particle field for depth. */
function Particles({ animate }) {
  const points = useRef();
  const positions = useMemo(() => {
    const n = 420;
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const r = 4 + ((Math.sin(i * 78.233) * 43758.5453) % 1 + 1) * 3;
      const theta = i * 2.399963; // golden angle spiral
      const y = ((i / n) * 2 - 1) * 3.5;
      arr[i * 3] = Math.cos(theta) * r;
      arr[i * 3 + 1] = y + 1.5;
      arr[i * 3 + 2] = Math.sin(theta) * r;
    }
    return arr;
  }, []);
  useFrame((_, delta) => {
    if (animate) points.current.rotation.y += delta * 0.03;
  });
  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.035} color="#9CA3AF" transparent opacity={0.55} sizeAttenuation depthWrite={false} />
    </points>
  );
}

/** Tilts the whole scene toward the pointer (eased), plus a slow idle sway. */
function ParallaxRig({ children, animate }) {
  const group = useRef();
  useFrame(({ pointer, clock }) => {
    if (!animate) return;
    const idle = Math.sin(clock.elapsedTime * 0.25) * 0.08;
    group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, -0.55 + pointer.x * 0.35 + idle, 0.05);
    group.current.rotation.x = THREE.MathUtils.lerp(group.current.rotation.x, pointer.y * 0.12, 0.05);
  });
  return (
    <group ref={group} rotation={[0, -0.55, 0]}>
      {children}
    </group>
  );
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * Landing-page hero scene. Rendering pauses while the canvas is scrolled out of
 * view, and users who prefer reduced motion get a single static frame.
 */
export default function HeroScene() {
  const container = useRef();
  const [visible, setVisible] = useState(true);
  const [ready, setReady] = useState(false);
  const animate = !prefersReducedMotion();

  useEffect(() => {
    if (!container.current || typeof IntersectionObserver === 'undefined') return undefined;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.05 });
    observer.observe(container.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={container}
      className={`absolute inset-0 transition-opacity duration-700 ${ready ? 'opacity-100' : 'opacity-0'}`}
      aria-hidden="true"
    >
      <Canvas
        dpr={[1, 1.75]}
        camera={{ position: [0, 3.6, 10.4], fov: 38 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        frameloop={animate && visible ? 'always' : 'demand'}
        onCreated={({ camera }) => {
          camera.lookAt(0, 1.4, 0);
          // Fade in once the first frame has been drawn
          requestAnimationFrame(() => setReady(true));
        }}
      >
        <ambientLight intensity={0.35} />
        <directionalLight position={[4, 8, 5]} intensity={1.1} />
        <pointLight position={[-4, 3, 2]} intensity={18} color="#22D3EE" distance={12} />
        <pointLight position={[4, 2, -3]} intensity={14} color="#A78BFA" distance={12} />
        <ParallaxRig animate={animate}>
          <BasePlate />
          <BarField animate={animate} />
          <PredictionCore animate={animate} />
        </ParallaxRig>
        <Particles animate={animate} />
      </Canvas>
    </div>
  );
}

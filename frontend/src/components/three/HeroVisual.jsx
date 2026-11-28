import React, { Component, Suspense, lazy } from 'react';

// three.js is loaded only when the landing page renders this component,
// so the authenticated app pages never download it.
const HeroScene = lazy(() => import('./HeroScene'));

const webglAvailable = () => {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(window.WebGLRenderingContext && (canvas.getContext('webgl2') || canvas.getContext('webgl')));
  } catch {
    return false;
  }
};

/** Static stand-in (no WebGL, while loading, or if the scene throws). */
function StaticHero() {
  const bars = [38, 62, 48, 80, 56, 92, 70];
  return (
    <div className="absolute inset-0 flex items-end justify-center pb-16" aria-hidden="true">
      <div className="flex items-end gap-3 [transform:perspective(900px)_rotateX(22deg)_rotateY(-18deg)]">
        {bars.map((h, i) => (
          <div
            key={i}
            className="w-7 sm:w-9 rounded-t bg-gradient-to-t from-primary/70 to-secondary/80 shadow-[0_0_24px_rgba(34,211,238,0.25)]"
            style={{ height: `${h * 2.2}px` }}
          />
        ))}
      </div>
    </div>
  );
}

class SceneBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    console.warn('[SocialIQ] 3D hero unavailable, showing static version:', error.message);
  }

  render() {
    return this.state.failed ? <StaticHero /> : this.props.children;
  }
}

export default function HeroVisual() {
  if (!webglAvailable()) return <StaticHero />;
  return (
    <SceneBoundary>
      <Suspense fallback={<StaticHero />}>
        <HeroScene />
      </Suspense>
    </SceneBoundary>
  );
}

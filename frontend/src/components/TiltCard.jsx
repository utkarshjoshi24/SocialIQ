import React from 'react';
import useTilt from '../hooks/useTilt';

/**
 * Element with the subtle 3D pointer tilt (see useTilt and `.tilt-3d` in index.css).
 * Renders `as` (default <article>) and passes every other prop through.
 */
export default function TiltCard({ as: Tag = 'article', className = '', maxDeg = 3, children, ...rest }) {
  const tilt = useTilt(maxDeg);
  return (
    <Tag {...rest} {...tilt} className={`tilt-3d ${className}`}>
      {children}
    </Tag>
  );
}

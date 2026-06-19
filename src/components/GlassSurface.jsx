import { useId } from 'react';

import './GlassSurface.css';

const GlassSurface = ({
  children,
  width = 'auto',
  height = 'auto',
  borderRadius = 24,
  className = '',
  style = {},
  disableDistortion = false
}) => {
  const filterId = useId();
  const filterUrl = `url(#distortion-${filterId.replace(/:/g, '')})`;
  const containerStyle = {
    ...style,
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
    borderRadius: `${borderRadius}px`
  };

  return (
    <>
      {!disableDistortion && (
        <svg aria-hidden="true" style={{ width: 0, height: 0, position: 'absolute', pointerEvents: 'none' }}>
          <defs>
            <filter id={`distortion-${filterId.replace(/:/g, '')}`}>
              <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="3" result="noise" />
              <feDisplacementMap in="SourceGraphic" in2="noise" scale="3" xChannelSelector="R" yChannelSelector="G" />
            </filter>
          </defs>
        </svg>
      )}
      <div
        className={`glass-surface ${className}`}
        style={containerStyle}
      >
        {!disableDistortion && (
            <div className="glass-surface__distortion" style={{ filter: filterUrl }} />
        )}
        <div className="glass-surface__content">{children}</div>
      </div>
    </>
  );
};

export default GlassSurface;

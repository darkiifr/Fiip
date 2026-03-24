import { useState } from 'react';
import './LiquidGlassButton.css';

export default function LiquidGlassButton({ 
    children, 
    onClick, 
    className = '',
    contrast = 'dark',
    accentColor = '#aaf',
    roundness = 60,
    paddingX = 3,
    paddingY = 0.75
}) {
    const [isHovering, setIsHovering] = useState(false);
    
    const isDark = contrast === 'dark' || contrast === 'dark-contrast';
    const textColor = contrast === 'light-contrast' ? 'text-black' : 
                      contrast === 'dark-contrast' ? 'text-black/50' : 
                      'text-white';

    const buttonClass = isDark ? 'dark-glassy-button' : 'light-glassy-button';
    const shadowClass = isDark ? 'dark-shadow' : 'light-shadow';

    return (
        <div 
            className={`liquid-glass-wrap ${className}`}
            style={{ '--roundness': `${roundness}px` }}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
        >
            {isHovering && (
                <div 
                    className="absolute top-0 h-full w-full bg-[#e4fbfbb8] opacity-60 transition-opacity duration-300"
                >
                    <div 
                        className="pointer-events-none absolute inset-0 rounded-full"
                        style={{
                            borderRadius: 'inherit',
                            mixBlendMode: 'lighten',
                            opacity: 0.7,
                            background: `conic-gradient(from 0deg, #e7ffff 0%, ${accentColor} 25%, #fff 50%, ${accentColor} 75%, #e7ffff 100%)`,
                            animation: 'rotate-gradient 4s ease-in-out infinite'
                        }}
                    />
                </div>
            )}
            
            {accentColor !== '#D7DADD' && (
                <div 
                    className="absolute top-0 h-full w-full opacity-30" 
                    style={{ backgroundColor: accentColor }}
                />
            )}

            <button 
                onClick={onClick}
                className={`liquid-glass-button overflow-hidden ${buttonClass}`}
            >
                <span 
                    className={`${textColor} whitespace-nowrap`}
                    style={{
                        paddingLeft: `${paddingX}rem`,
                        paddingRight: `${paddingX}rem`,
                        paddingTop: `${paddingY}rem`,
                        paddingBottom: `${paddingY}rem`,
                        letterSpacing: '-0.05em',
                        fontWeight: 500,
                    }}
                >
                    {children}
                </span>
            </button>
            <div className={`liquid-glass-shadow ${shadowClass}`} />
            
            <div className="liquid-glass-filter" style={{ borderRadius: `${roundness}px` }} />
            
            <svg style={{ display: 'none', borderRadius: `${roundness}px` }}>
                <filter id="lg-dist" x="0%" y="0%" width="100%" height="100%">
                    <feTurbulence type="fractalNoise" baseFrequency="0.008 0.008" numOctaves="2" seed="92" result="noise" />
                    <feGaussianBlur in="noise" stdDeviation="2" result="blurred" />
                    <feDisplacementMap in="SourceGraphic" in2="blurred" scale="230" xChannelSelector="R" yChannelSelector="G" />
                </filter>
            </svg>
        </div>
    );
}

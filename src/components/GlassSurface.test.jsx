import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import GlassSurface from './GlassSurface';

describe('GlassSurface Component', () => {
  it('renders children correctly', () => {
    render(
      <GlassSurface>
        <div data-testid="test-child">Hello Glass</div>
      </GlassSurface>
    );

    expect(screen.getByTestId('test-child')).toBeInTheDocument();
    expect(screen.getByText('Hello Glass')).toBeInTheDocument();
  });

  it('applies custom dimensions correctly', () => {
    const { container } = render(
      <GlassSurface width={500} height="80vh" borderRadius={12}>
        Content
      </GlassSurface>
    );

    const surface = container.querySelector('.glass-surface');
    expect(surface).toHaveStyle({
      width: '500px',
      height: '80vh',
      borderRadius: '12px'
    });
  });

  it('renders SVG distortion filter by default', () => {
    const { container } = render(<GlassSurface>Content</GlassSurface>);
    
    // Check if SVG filter exists
    const svg = container.querySelector('svg[aria-hidden="true"]');
    expect(svg).toBeInTheDocument();
    
    const filter = container.querySelector('filter');
    expect(filter).toBeInTheDocument();
    expect(filter.id).toContain('distortion-');
  });

  it('disables distortion when disableDistortion prop is true', () => {
    const { container } = render(
      <GlassSurface disableDistortion={true}>
        Content
      </GlassSurface>
    );

    const svg = container.querySelector('svg[aria-hidden="true"]');
    expect(svg).not.toBeInTheDocument();
    
    const distortion = container.querySelector('.glass-surface__distortion');
    expect(distortion).not.toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <GlassSurface className="custom-class">
        Content
      </GlassSurface>
    );

    expect(container.querySelector('.glass-surface')).toHaveClass('custom-class');
  });
});
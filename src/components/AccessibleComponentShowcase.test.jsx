import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import AccessibleComponentShowcase from './AccessibleComponentShowcase';

describe('AccessibleComponentShowcase Components', () => {
  it('renders AccessibleComponentShowcase correctly', () => {
    render(<AccessibleComponentShowcase />);
    
    // Check main headings or features
    expect(screen.getByText('Interface macOS 26')).toBeInTheDocument();
    expect(screen.getByText('Radix UI + React Aria + Liquid Glass')).toBeInTheDocument();
  });

  it('has correct ARIA tab roles and structure', () => {
    render(<AccessibleComponentShowcase />);
    
    const tabList = screen.getByRole('tablist');
    expect(tabList).toBeInTheDocument();
    
    const tabTriggers = screen.getAllByRole('tab');
    expect(tabTriggers).toHaveLength(2);
    // Tab 0 should be "Expérience"
    expect(tabTriggers[0]).toHaveAttribute('aria-selected', 'true');
    expect(tabTriggers[0]).toHaveTextContent('Expérience');
  });
});

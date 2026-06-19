import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import CustomSelect from './CustomSelect';

describe('CustomSelect Component', () => {
    const options = [
        { value: 'option1', label: 'Option 1' },
        { value: 'option2', label: 'Option 2' },
        { value: 'option3', label: 'Option 3' },
    ];

    it('renders with placeholder when no value is selected', () => {
        render(<CustomSelect options={options} placeholder="Select an option" onChange={() => {}} />);
        expect(screen.getByText('Select an option')).toBeInTheDocument();
    });

    it('renders the selected option label', () => {
        render(<CustomSelect options={options} value="option2" onChange={() => {}} />);
        expect(screen.getByText('Option 2')).toBeInTheDocument();
    });

    it('opens the menu when clicked', () => {
        render(<CustomSelect options={options} onChange={() => {}} />);
        const button = screen.getByRole('button');
        fireEvent.click(button);
        
        // Options should be visible (using getAllByText because buttons contain labels)
        expect(screen.getByText('Option 1')).toBeInTheDocument();
        expect(screen.getByText('Option 2')).toBeInTheDocument();
        expect(screen.getByText('Option 3')).toBeInTheDocument();
    });

    it('calls onChange and closes when an option is selected', () => {
        const handleChange = vi.fn();
        render(<CustomSelect options={options} onChange={handleChange} />);
        
        fireEvent.click(screen.getByRole('button'));
        
        // Find the button inside the portal
        const optionButtons = screen.getAllByRole('button');
        const targetOption = optionButtons.find(btn => btn.textContent.includes('Option 3'));
        
        fireEvent.click(targetOption);

        expect(handleChange).toHaveBeenCalledWith('option3');
        expect(screen.queryByText('Option 1')).not.toBeInTheDocument();
    });

    it('does not open when disabled', () => {
        render(<CustomSelect options={options} disabled={true} onChange={() => {}} />);
        const button = screen.getByRole('button');
        fireEvent.click(button);
        
        expect(screen.queryByText('Option 1')).not.toBeInTheDocument();
    });
});
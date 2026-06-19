import { useState, useRef, useEffect, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from './ui/LiquidGlassPrimitive';

import IconCheck from '~icons/mingcute/check-fill';
import IconChevronDown from '~icons/mingcute/down-fill';

interface Option {
    value: any;
    label: string;
    icon?: string | ReactNode;
}

interface CustomSelectProps {
    value: any;
    onChange: (value: any) => void;
    options?: Option[];
    placeholder?: string;
    renderOption?: (option: Option) => ReactNode;
    renderTrigger?: (option: Option) => ReactNode;
    className?: string;
    disabled?: boolean;
}

export default function CustomSelect({ 
    value, 
    onChange, 
    options = [], 
    placeholder = "Sélectionner...", 
    renderOption, 
    renderTrigger,
    className = "",
    disabled = false
}: CustomSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0, width: 0 });

    // Handle click outside & scroll
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (triggerRef.current && !triggerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        const handleScroll = (event: Event) => {
            // Close only if scrolling happens outside the menu
            if (menuRef.current && menuRef.current.contains(event.target as Node)) {
                return;
            }
            setIsOpen(false);
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            window.addEventListener('resize', () => { setIsOpen(false); });
            window.addEventListener('scroll', handleScroll, true);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('resize', () => { setIsOpen(false); });
            window.removeEventListener('scroll', handleScroll, true);
        };
    }, [isOpen]);

    // Calculate menu position
    useEffect(() => {
        if (isOpen && triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            setMenuPosition({
                top: rect.bottom + window.scrollY + 4,
                left: rect.left + window.scrollX,
                width: rect.width
            });
        }
    }, [isOpen]);

    const selectedOption = options.find(opt => opt.value === value);

    const handleSelect = (optionValue: any) => {
        onChange(optionValue);
        setIsOpen(false);
    };

    // Render dropdown menu in portal
    const renderMenu = () => {
        if (!isOpen) { 
            return null; 
        }

        const menuContent = (
            <div 
                ref={menuRef}
                role="listbox"
                className="fixed z-9999 bg-sidebar-dark/80 backdrop-blur-2xl border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 ease-out max-h-60 overflow-y-auto custom-scrollbar"
                style={{
                    top: menuPosition.top,
                    left: menuPosition.left,
                    width: menuPosition.width,
                    minWidth: '200px'
                }}
                onMouseDown={(e) => { e.stopPropagation(); }} // Prevent closing when clicking inside menu
            >
                {options.length === 0 ? (
                    <div className="px-3 py-2.5 text-sm text-gray-500 italic text-center">Aucune option</div>
                ) : (
                    options.map((option) => (
                        <button
                            key={option.value}
                            type="button"
                            onClick={() => { handleSelect(option.value); }}
                            className={cn(
                                "w-full text-left px-3 py-2 text-sm flex items-center justify-between transition-colors",
                                value === option.value ? "bg-blue-600 text-white" : "text-gray-200 hover:bg-white/10"
                            )}
                        >
                            <div className="flex items-center gap-3 truncate">
                                {renderOption ? renderOption(option) : (
                                    <>
                                        {option.icon && (typeof option.icon === 'string' ? <span className="text-base shrink-0">{option.icon}</span> : option.icon)}
                                        <span className="font-medium truncate">{option.label}</span>
                                    </>
                                )}
                            </div>
                            {value === option.value && <IconCheck className="w-4 h-4 shrink-0" />}
                        </button>
                    ))
                )}
            </div>
        );

        return createPortal(menuContent, document.body);
    };

    return (
        <div className="relative w-full">
            <button
                ref={triggerRef}
                onClick={() => { if (!disabled) { setIsOpen(!isOpen); } }}
                className={cn(
                    "w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-100 outline-none flex items-center justify-between hover:bg-white/10 transition-colors shadow-sm",
                    disabled ? "opacity-50 cursor-not-allowed" : "cursor-default",
                    isOpen && "ring-2 ring-blue-500/50 border-blue-500/50",
                    className
                )}
                type="button"
            >
                <div className="flex items-center gap-2 truncate pr-2">
                    {selectedOption ? (
                        renderTrigger ? renderTrigger(selectedOption) : (
                            <>
                                {selectedOption.icon && (typeof selectedOption.icon === 'string' ? <span className="text-gray-400">{selectedOption.icon}</span> : selectedOption.icon)}
                                <span className="truncate">{selectedOption.label}</span>
                            </>
                        )
                    ) : (
                        <span className="text-gray-400">{placeholder}</span>
                    )}
                </div>
                <IconChevronDown className={cn(
                    "w-4 h-4 text-gray-500 transition-transform duration-200 shrink-0",
                    isOpen && "rotate-180"
                )} />
            </button>
            {renderMenu()}
        </div>
    );
}
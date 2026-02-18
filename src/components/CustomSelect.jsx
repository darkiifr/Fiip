import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';

export default function CustomSelect({ 
    value, 
    onChange, 
    options = [], 
    placeholder = "Sélectionner...", 
    renderOption, 
    renderTrigger,
    className = "",
    disabled = false
}) {
    const [isOpen, setIsOpen] = useState(false);
    const triggerRef = useRef(null);
    const menuRef = useRef(null);
    const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0, width: 0 });

    // Handle click outside & scroll
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (triggerRef.current && !triggerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        const handleScroll = (event) => {
            // Close only if scrolling happens outside the menu
            if (menuRef.current && menuRef.current.contains(event.target)) {
                return;
            }
            setIsOpen(false);
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            window.addEventListener('resize', () => setIsOpen(false));
            window.addEventListener('scroll', handleScroll, true);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('resize', () => setIsOpen(false));
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

    const handleSelect = (optionValue) => {
        onChange(optionValue);
        setIsOpen(false);
    };

    // Render dropdown menu in portal
    const renderMenu = () => {
        if (!isOpen) return null;

        const menuContent = (
            <div 
                ref={menuRef}
                className="fixed z-[9999] bg-black border border-white/10 rounded-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 ease-out max-h-60 overflow-y-auto custom-scrollbar"
                style={{
                    top: menuPosition.top,
                    left: menuPosition.left,
                    width: menuPosition.width,
                    minWidth: '200px'
                }}
                onMouseDown={(e) => e.stopPropagation()} // Prevent closing when clicking inside menu
            >
                {options.length === 0 ? (
                    <div className="px-3 py-2.5 text-sm text-gray-500 italic text-center">Aucune option</div>
                ) : (
                    options.map((option) => (
                        <button
                            key={option.value}
                            onClick={() => handleSelect(option.value)}
                            className={`w-full text-left px-3 py-2.5 text-sm flex items-center justify-between hover:bg-white/10 transition-colors ${value === option.value ? 'bg-blue-600/20 text-blue-400' : 'text-gray-200'}`}
                        >
                            <div className="flex items-center gap-3 truncate">
                                {renderOption ? renderOption(option) : (
                                    <>
                                        {option.icon && <span className="text-base shrink-0">{option.icon}</span>}
                                        <span className="font-medium truncate">{option.label}</span>
                                    </>
                                )}
                            </div>
                            {value === option.value && <Check className="w-4 h-4 shrink-0" />}
                        </button>
                    ))
                )}
            </div>
        );

        return createPortal(menuContent, document.body);
    };

    return (
        <>
            <button
                ref={triggerRef}
                onClick={() => !disabled && setIsOpen(!isOpen)}
                className={`w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-gray-100 outline-none flex items-center justify-between hover:bg-white/5 transition-colors ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
                type="button"
            >
                <div className="flex items-center gap-2 truncate pr-2">
                    {selectedOption ? (
                        renderTrigger ? renderTrigger(selectedOption) : (
                            <>
                                {selectedOption.icon && <span className="text-gray-400">{selectedOption.icon}</span>}
                                <span className="truncate">{selectedOption.label}</span>
                            </>
                        )
                    ) : (
                        <span className="text-gray-400">{placeholder}</span>
                    )}
                </div>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {renderMenu()}
        </>
    );
}

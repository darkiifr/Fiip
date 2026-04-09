import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import IconChevronDown from '~icons/mingcute/down-fill';

export default function ToolbarCombobox({ 
    value, 
    onChange, 
    options = [], 
    placeholder = "Select...", 
    className = "",
    dropdownWidth = 160,
    styleProp = null
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [inputValue, setInputValue] = useState(value || '');
    const containerRef = useRef(null);
    const inputRef = useRef(null);
    const menuRef = useRef(null);
    const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0, width: 0 });

    // Sync input value when external value changes
    useEffect(() => {
        setTimeout(() => setInputValue(value || ''), 0);
    }, [value]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
                // On unfocus, apply whatever is currently typed
                if (inputValue !== value) {
                   onChange(inputValue);
                }
            }
        };

        const handleScroll = (event) => {
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
    }, [isOpen, inputValue, value, onChange]);

    const handleOpen = () => {
        if (!isOpen && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            setMenuPosition({
                top: rect.bottom + window.scrollY + 4,
                left: rect.left + window.scrollX,
                width: rect.width
            });
            setIsOpen(true);
        }
    };

    const handleSelect = (optionValue) => {
        setInputValue(optionValue);
        onChange(optionValue);
        setIsOpen(false);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            onChange(inputValue);
            setIsOpen(false);
            if (inputRef.current) inputRef.current.blur();
        } else if (e.key === 'Escape') {
            setIsOpen(false);
            setInputValue(value || ''); // Revert
        }
    };

    const renderMenu = () => {
        if (!isOpen) return null;

        const menuContent = (
            <div 
                ref={menuRef}
                className="fixed z-[9999] bg-[#1C1C1E] border border-white/10 rounded-lg shadow-xl animate-in fade-in zoom-in-95 duration-100 ease-out max-h-64 overflow-y-auto custom-scrollbar"
                style={{
                    top: menuPosition.top,
                    left: menuPosition.left,
                    minWidth: dropdownWidth
                }}
                onMouseDown={(e) => e.stopPropagation()} // Prevent focus loss on input when clicking menu
            >
                {(() => {
                    const searchStr = inputValue === value ? '' : (inputValue || '').toLowerCase();
                    const filteredOptions = options.filter(o => 
                        o.label.toLowerCase().includes(searchStr)
                    );
                    return filteredOptions.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-gray-500 italic text-center">Aucune option</div>
                    ) : (
                        filteredOptions.map((option) => (
                            <button
                                key={option.value}
                                onClick={(e) => {
                                    e.preventDefault();
                                    handleSelect(option.value);
                                }}
                                style={styleProp ? { [styleProp]: option.value } : {}}
                                className={`w-full text-left px-3 py-2.5 text-sm transition-colors block truncate ${value === option.value ? 'bg-blue-600/20 text-blue-400 font-medium' : 'text-gray-200 hover:bg-white/10'}`}
                            >
                                {option.label}
                            </button>
                        ))
                    );
                })()}
            </div>
        );

        return createPortal(menuContent, document.body);
    };

    return (
        <div ref={containerRef} className={`relative flex items-center bg-black/20 border border-white/5 rounded-lg group hover:border-white/10 transition-colors ${className}`}>
            <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => {
                    setInputValue(e.target.value);
                    if (!isOpen) handleOpen();
                }}
                onFocus={handleOpen}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                className="w-full bg-transparent text-gray-200 px-2.5 py-1 text-[13px] outline-none focus:outline-none"
            />
            <button 
                type="button"
                onClick={() => {
                   if (isOpen) setIsOpen(false);
                   else handleOpen();
                }}
                className="pr-2 pl-1 h-full text-gray-400 group-hover:text-gray-300 transition-colors flex items-center"
            >
                <IconChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {renderMenu()}
        </div>
    );
}

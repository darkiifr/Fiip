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
            if (inputRef.current) {inputRef.current.blur();}
        } else if (e.key === 'Escape') {
            setIsOpen(false);
            setInputValue(value || ''); // Revert
        }
    };

    const renderMenu = () => {
        if (!isOpen) {return null;}

        const menuContent = (
            <div 
                ref={menuRef}
                className="fixed z-[10000] max-h-64 overflow-y-auto rounded-xl border border-warm-border-light bg-warm-card-light text-warm-text-primary-light shadow-xl animate-in fade-in zoom-in-95 duration-100 ease-out custom-scrollbar dark:border-white/10 dark:bg-[#1C1C1E] dark:text-warm-text-primary-dark"
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
                                className={`block w-full truncate px-3 py-2.5 text-left text-sm transition-colors ${value === option.value ? 'bg-amber-500/15 text-amber-700 font-medium dark:text-amber-300' : 'text-warm-text-secondary-light hover:bg-warm-sidebar-item-active hover:text-warm-text-primary-light dark:text-gray-200 dark:hover:bg-white/10 dark:hover:text-white'}`}
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
        <div ref={containerRef} className={`group relative flex items-center rounded-lg border border-warm-border-light bg-warm-card-light text-warm-text-primary-light transition-colors hover:border-amber-500/25 dark:border-white/5 dark:bg-black/20 dark:text-warm-text-primary-dark dark:hover:border-white/10 ${className}`}>
            <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => {
                    setInputValue(e.target.value);
                    if (!isOpen) {handleOpen();}
                }}
                onFocus={handleOpen}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                className="w-full bg-transparent px-2.5 py-1 text-[13px] text-warm-text-primary-light outline-none placeholder:text-warm-text-muted-light focus:outline-none dark:text-gray-200 dark:placeholder:text-white/30"
            />
            <button 
                type="button"
                onClick={() => {
                   if (isOpen) {setIsOpen(false);}
                   else {handleOpen();}
                }}
                className="flex h-full items-center pl-1 pr-2 text-warm-text-muted-light transition-colors group-hover:text-warm-text-primary-light dark:text-gray-400 dark:group-hover:text-gray-300"
            >
                <IconChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {renderMenu()}
        </div>
    );
}

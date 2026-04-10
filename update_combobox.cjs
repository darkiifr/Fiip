const fs = require('fs');
let code = fs.readFileSync('src/components/ToolbarCombobox.jsx', 'utf8');

code = code.replace(
`                {options.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-gray-500 italic text-center">Aucune option</div>
                ) : (
                    options.map((option) => (
                        <button
                            key={option.value}
                            onClick={() => handleSelect(option.value)}
                            style={styleProp ? { [styleProp]: option.value } : {}}
                            className={\`w-full text-left px-3 py-2.5 text-sm transition-colors block truncate \${value === option.value ? 'bg-blue-600/20 text-blue-400 font-medium' : 'text-gray-200 hover:bg-white/10'}\`}
                        >
                            {option.label}
                        </button>
                    ))
                )}`,
`                {(() => {
                    const filteredOptions = options.filter(o => 
                        o.label.toLowerCase().includes((inputValue || '').toLowerCase())
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
                                className={\`w-full text-left px-3 py-2.5 text-sm transition-colors block truncate \${value === option.value ? 'bg-blue-600/20 text-blue-400 font-medium' : 'text-gray-200 hover:bg-white/10'}\`}
                            >
                                {option.label}
                            </button>
                        ))
                    );
                })()}`
);

fs.writeFileSync('src/components/ToolbarCombobox.jsx', code);

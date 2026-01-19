import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown, Minus, Plus, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, Trash2, Pipette } from 'lucide-react';

// Color format types
type ColorFormat = 'HEX' | 'HSB' | 'RGB';

// Helper functions for color conversion
const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
};

const rgbToHex = (r: number, g: number, b: number): string => {
    return '#' + [r, g, b].map(x => {
        const hex = Math.max(0, Math.min(255, Math.round(x))).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    }).join('');
};

const rgbToHsb = (r: number, g: number, b: number): { h: number; s: number; b: number } => {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const d = max - min;
    let h = 0;
    const s = max === 0 ? 0 : d / max;
    const v = max;
    
    if (max !== min) {
        switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
            case g: h = ((b - r) / d + 2) / 6; break;
            case b: h = ((r - g) / d + 4) / 6; break;
        }
    }
    return { h: Math.round(h * 360), s: Math.round(s * 100), b: Math.round(v * 100) };
};

const hsbToRgb = (h: number, s: number, b: number): { r: number; g: number; b: number } => {
    h /= 360; s /= 100; b /= 100;
    let r = 0, g = 0, bl = 0;
    const i = Math.floor(h * 6);
    const f = h * 6 - i;
    const p = b * (1 - s);
    const q = b * (1 - f * s);
    const t = b * (1 - (1 - f) * s);
    
    switch (i % 6) {
        case 0: r = b; g = t; bl = p; break;
        case 1: r = q; g = b; bl = p; break;
        case 2: r = p; g = b; bl = t; break;
        case 3: r = p; g = q; bl = b; break;
        case 4: r = t; g = p; bl = b; break;
        case 5: r = b; g = p; bl = q; break;
    }
    return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(bl * 255) };
};

interface TextEditToolbarProps {
    fontFamily: string;
    fontSize: number;
    fontWeight: string;
    textColor: string;
    onFontFamilyChange: (value: string) => void;
    onFontSizeChange: (value: number) => void;
    onFontWeightChange: (value: string) => void;
    onColorChange: (color: string) => void;
    onBoldToggle: () => void;
    onItalicToggle: () => void;
    onUnderlineToggle: () => void;
    onAlignChange: (align: 'left' | 'center' | 'right') => void;
    onDelete: () => void;
    isBold?: boolean;
    isItalic?: boolean;
    isUnderline?: boolean;
    textAlign?: 'left' | 'center' | 'right';
}

// Font options - Extended list with popular Google Fonts
const FONT_OPTIONS = [
    // Sans-Serif (Modern)
    'Oswald',
    'Funnel Display',
    'Inter',
    'Roboto',
    'Montserrat',
    'Poppins',
    'Open Sans',
    'Lato',
    'Nunito',
    'Raleway',
    'Work Sans',
    'Source Sans Pro',
    'Ubuntu',
    'Rubik',
    'DM Sans',
    'Manrope',
    'Space Grotesk',
    'Plus Jakarta Sans',
    'Outfit',
    'Lexend',
    
    // Serif (Elegant)
    'Playfair Display',
    'Merriweather',
    'Lora',
    'Crimson Text',
    'Libre Baskerville',
    'Source Serif Pro',
    'Cormorant Garamond',
    'EB Garamond',
    
    // Display (Bold/Impact)
    'Bebas Neue',
    'Anton',
    'Teko',
    'Russo One',
    'Righteous',
    'Permanent Marker',
    'Titan One',
    'Bungee',
    'Bangers',
    'Black Ops One',
    
    // Handwriting/Script
    'Dancing Script',
    'Pacifico',
    'Satisfy',
    'Great Vibes',
    'Caveat',
    'Kalam',
    'Indie Flower',
    
    // Monospace
    'Fira Code',
    'Source Code Pro',
    'JetBrains Mono',
    'Space Mono',
    
    // System Fonts
    'Arial',
    'Helvetica',
    'Georgia',
    'Times New Roman',
    'Verdana',
    'Trebuchet MS',
    'Comic Sans MS',
    'Impact',
];

const FONT_WEIGHTS = [
    { label: 'Light', value: 'Light' },
    { label: 'Regular', value: 'Regular' },
    { label: 'Medium', value: 'Medium' },
    { label: 'Bold', value: 'Bold' },
];

/**
 * TextEditToolbar - Shows in the top toolbar when a text element is selected
 * Matches Clueso's text edit toolbar: Font Family, Size, Weight, B/I/U, Alignment, Delete
 */
export const TextEditToolbar: React.FC<TextEditToolbarProps> = ({
    fontFamily,
    fontSize,
    fontWeight,
    textColor,
    onFontFamilyChange,
    onFontSizeChange,
    onFontWeightChange,
    onColorChange,
    onBoldToggle,
    onItalicToggle,
    onUnderlineToggle,
    onAlignChange,
    onDelete,
    isBold = false,
    isItalic = false,
    isUnderline = false,
    textAlign = 'center',
}) => {
    const [isFontDropdownOpen, setIsFontDropdownOpen] = useState(false);
    const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
    const [colorFormat, setColorFormat] = useState<ColorFormat>('RGB');
    const [isFormatDropdownOpen, setIsFormatDropdownOpen] = useState(false);
    const fontDropdownRef = useRef<HTMLDivElement>(null);
    const colorPickerRef = useRef<HTMLDivElement>(null);
    const gradientPickerRef = useRef<HTMLDivElement>(null);
    
    // Color state for picker
    const rgb = hexToRgb(textColor);
    const hsb = rgbToHsb(rgb.r, rgb.g, rgb.b);
    const [pickerHue, setPickerHue] = useState(hsb.h);
    const [pickerPos, setPickerPos] = useState({ x: hsb.s, y: 100 - hsb.b });
    
    // Update picker position when textColor changes externally
    useEffect(() => {
        const newRgb = hexToRgb(textColor);
        const newHsb = rgbToHsb(newRgb.r, newRgb.g, newRgb.b);
        setPickerHue(newHsb.h);
        setPickerPos({ x: newHsb.s, y: 100 - newHsb.b });
    }, [textColor]);
    
    // Handle gradient picker click/drag
    const handleGradientInteraction = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (!gradientPickerRef.current) return;
        const rect = gradientPickerRef.current.getBoundingClientRect();
        const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
        const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
        setPickerPos({ x, y });
        
        const newRgb = hsbToRgb(pickerHue, x, 100 - y);
        onColorChange(rgbToHex(newRgb.r, newRgb.g, newRgb.b));
    }, [pickerHue, onColorChange]);
    
    // Handle hue slider change
    const handleHueChange = useCallback((hue: number) => {
        setPickerHue(hue);
        const newRgb = hsbToRgb(hue, pickerPos.x, 100 - pickerPos.y);
        onColorChange(rgbToHex(newRgb.r, newRgb.g, newRgb.b));
    }, [pickerPos, onColorChange]);

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (fontDropdownRef.current && !fontDropdownRef.current.contains(e.target as Node)) {
                setIsFontDropdownOpen(false);
            }
            if (colorPickerRef.current && !colorPickerRef.current.contains(e.target as Node)) {
                setIsColorPickerOpen(false);
                setIsFormatDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div data-text-toolbar="true" className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
            {/* Font Family Dropdown */}
            <div className="relative" ref={fontDropdownRef}>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsFontDropdownOpen(!isFontDropdownOpen);
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 bg-[#3b3b50] hover:bg-[#4a4a5e] rounded-md transition-all duration-200 min-w-[120px]"
                >
                    <span className="text-white text-xs font-medium truncate" style={{ fontFamily }}>
                        {fontFamily}
                    </span>
                    <ChevronDown size={12} className="text-gray-400 flex-shrink-0" />
                </button>
                
                {isFontDropdownOpen && (
                    <div className="absolute top-full left-0 mt-1 bg-[#1a1a2e] border border-[#3a3a5e] rounded-lg shadow-xl z-50 min-w-[150px] max-h-64 overflow-y-auto">
                        {FONT_OPTIONS.map((font) => (
                            <button
                                key={font}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onFontFamilyChange(font);
                                    setIsFontDropdownOpen(false);
                                }}
                                className={`w-full text-left px-3 py-2 text-sm text-white hover:bg-white/10 transition-colors ${
                                    font === fontFamily ? 'bg-white/5' : ''
                                }`}
                                style={{ fontFamily: font }}
                            >
                                {font}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Font Size */}
            <div className="flex items-center bg-[#3b3b50] rounded-md">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onFontSizeChange(Math.max(10, fontSize - 1));
                    }}
                    className="px-1.5 py-1.5 text-gray-400 hover:text-white transition-colors"
                >
                    <Minus size={10} />
                </button>
                <input
                    type="number"
                    value={fontSize}
                    onChange={(e) => onFontSizeChange(Number(e.target.value))}
                    onClick={(e) => e.stopPropagation()}
                    className="w-10 bg-transparent text-center text-white text-xs font-medium focus:outline-none"
                />
                <span className="text-gray-400 text-xs">px</span>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onFontSizeChange(fontSize + 1);
                    }}
                    className="px-1.5 py-1.5 text-gray-400 hover:text-white transition-colors"
                >
                    <Plus size={10} />
                </button>
            </div>

            {/* Separator */}
            <div className="w-px h-5 bg-[#3a3a5e]" />

            {/* Text Color Picker */}
            <div className="relative" ref={colorPickerRef}>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsColorPickerOpen(!isColorPickerOpen);
                    }}
                    className="flex items-center gap-1.5 px-2 py-1.5 bg-[#3b3b50] hover:bg-[#4a4a5e] rounded-md transition-all duration-200"
                    title={`Text Color: ${textColor}`}
                >
                    <div 
                        className="w-5 h-5 rounded-full border-2 border-white/30"
                        style={{ backgroundColor: textColor }}
                    />
                </button>
                
                {isColorPickerOpen && (
                    <div 
                        className="absolute top-full left-0 mt-2 bg-[#1a1a2e] border border-[#3a3a5e] rounded-xl shadow-2xl z-50 p-4" 
                        data-color-picker="true"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Main Gradient Picker - Saturation/Brightness */}
                        <div 
                            ref={gradientPickerRef}
                            className="relative w-56 h-40 rounded-lg overflow-hidden cursor-crosshair mb-3"
                            style={{
                                background: `
                                    linear-gradient(to bottom, transparent 0%, black 100%),
                                    linear-gradient(to right, white 0%, hsl(${pickerHue}, 100%, 50%) 100%)
                                `
                            }}
                            onMouseDown={(e) => {
                                handleGradientInteraction(e);
                                const handleMove = (moveE: MouseEvent) => {
                                    const rect = gradientPickerRef.current?.getBoundingClientRect();
                                    if (!rect) return;
                                    const x = Math.max(0, Math.min(100, ((moveE.clientX - rect.left) / rect.width) * 100));
                                    const y = Math.max(0, Math.min(100, ((moveE.clientY - rect.top) / rect.height) * 100));
                                    setPickerPos({ x, y });
                                    const newRgb = hsbToRgb(pickerHue, x, 100 - y);
                                    onColorChange(rgbToHex(newRgb.r, newRgb.g, newRgb.b));
                                };
                                const handleUp = () => {
                                    document.removeEventListener('mousemove', handleMove);
                                    document.removeEventListener('mouseup', handleUp);
                                };
                                document.addEventListener('mousemove', handleMove);
                                document.addEventListener('mouseup', handleUp);
                            }}
                        >
                            {/* Picker circle indicator */}
                            <div 
                                className="absolute w-4 h-4 border-2 border-white rounded-full shadow-lg pointer-events-none transform -translate-x-1/2 -translate-y-1/2"
                                style={{ 
                                    left: `${pickerPos.x}%`,
                                    top: `${pickerPos.y}%`,
                                    backgroundColor: textColor,
                                }}
                            />
                        </div>
                        
                        {/* Eyedropper + Current Color + Hue Slider Row */}
                        <div className="flex items-center gap-3 mb-3">
                            {/* Eyedropper */}
                            <button 
                                className="p-1.5 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors"
                                title="Eyedropper"
                            >
                                <Pipette size={16} />
                            </button>
                            
                            {/* Current Color Preview */}
                            <div 
                                className="w-8 h-8 rounded-full border-2 border-white/30 shadow-lg"
                                style={{ backgroundColor: textColor }}
                            />
                            
                            {/* Hue Slider - positioned on the circle */}
                            <div className="flex-1 relative h-4">
                                <div 
                                    className="absolute inset-0 rounded-full"
                                    style={{
                                        background: 'linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)'
                                    }}
                                />
                                <input
                                    type="range"
                                    min="0"
                                    max="360"
                                    value={pickerHue}
                                    onChange={(e) => handleHueChange(parseInt(e.target.value))}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                />
                                {/* Hue indicator circle */}
                                <div 
                                    className="absolute top-1/2 w-4 h-4 bg-white rounded-full border-2 border-gray-200 shadow-lg pointer-events-none transform -translate-y-1/2"
                                    style={{ left: `calc(${(pickerHue / 360) * 100}% - 8px)` }}
                                />
                            </div>
                        </div>
                        
                        {/* Color Value Inputs */}
                        <div className="flex items-center gap-2">
                            {/* Format Selector Dropdown */}
                            <div className="relative">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setIsFormatDropdownOpen(!isFormatDropdownOpen);
                                    }}
                                    className="flex items-center gap-1 px-2 py-1 text-gray-400 hover:text-white text-xs transition-colors"
                                >
                                    {colorFormat}
                                    <ChevronDown size={10} />
                                </button>
                                {isFormatDropdownOpen && (
                                    <div className="absolute top-full left-0 mt-1 bg-[#2a2a3e] border border-[#3a3a5e] rounded-lg shadow-xl z-50 overflow-hidden">
                                        {(['HEX', 'HSB', 'RGB'] as ColorFormat[]).map((format) => (
                                            <button
                                                key={format}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setColorFormat(format);
                                                    setIsFormatDropdownOpen(false);
                                                }}
                                                className={`w-full text-left px-3 py-1.5 text-xs hover:bg-white/10 transition-colors ${
                                                    format === colorFormat ? 'bg-[#0ea5e9] text-white' : 'text-gray-300'
                                                }`}
                                            >
                                                {format}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            
                            {/* Color Value Inputs based on format */}
                            {colorFormat === 'RGB' && (
                                <div className="flex items-center gap-1 flex-1">
                                    <div className="flex flex-col items-center">
                                        <input
                                            type="number"
                                            min="0"
                                            max="255"
                                            value={rgb.r}
                                            onChange={(e) => {
                                                const newR = Math.max(0, Math.min(255, parseInt(e.target.value) || 0));
                                                onColorChange(rgbToHex(newR, rgb.g, rgb.b));
                                            }}
                                            className="w-12 bg-[#2a2a3e] text-center text-white text-xs rounded px-1 py-1 focus:outline-none focus:ring-1 focus:ring-[#0ea5e9]"
                                        />
                                        <span className="text-gray-500 text-[10px] mt-0.5">R</span>
                                    </div>
                                    <div className="flex flex-col items-center">
                                        <input
                                            type="number"
                                            min="0"
                                            max="255"
                                            value={rgb.g}
                                            onChange={(e) => {
                                                const newG = Math.max(0, Math.min(255, parseInt(e.target.value) || 0));
                                                onColorChange(rgbToHex(rgb.r, newG, rgb.b));
                                            }}
                                            className="w-12 bg-[#2a2a3e] text-center text-white text-xs rounded px-1 py-1 focus:outline-none focus:ring-1 focus:ring-[#0ea5e9]"
                                        />
                                        <span className="text-gray-500 text-[10px] mt-0.5">G</span>
                                    </div>
                                    <div className="flex flex-col items-center">
                                        <input
                                            type="number"
                                            min="0"
                                            max="255"
                                            value={rgb.b}
                                            onChange={(e) => {
                                                const newB = Math.max(0, Math.min(255, parseInt(e.target.value) || 0));
                                                onColorChange(rgbToHex(rgb.r, rgb.g, newB));
                                            }}
                                            className="w-12 bg-[#2a2a3e] text-center text-white text-xs rounded px-1 py-1 focus:outline-none focus:ring-1 focus:ring-[#0ea5e9]"
                                        />
                                        <span className="text-gray-500 text-[10px] mt-0.5">B</span>
                                    </div>
                                    {/* Up/Down stepper */}
                                    <div className="flex flex-col ml-1">
                                        <button 
                                            className="text-gray-500 hover:text-white text-xs"
                                            onClick={() => {
                                                const newR = Math.min(255, rgb.r + 1);
                                                const newG = Math.min(255, rgb.g + 1);
                                                const newB = Math.min(255, rgb.b + 1);
                                                onColorChange(rgbToHex(newR, newG, newB));
                                            }}
                                        >▲</button>
                                        <button 
                                            className="text-gray-500 hover:text-white text-xs"
                                            onClick={() => {
                                                const newR = Math.max(0, rgb.r - 1);
                                                const newG = Math.max(0, rgb.g - 1);
                                                const newB = Math.max(0, rgb.b - 1);
                                                onColorChange(rgbToHex(newR, newG, newB));
                                            }}
                                        >▼</button>
                                    </div>
                                </div>
                            )}
                            
                            {colorFormat === 'HEX' && (
                                <div className="flex-1 flex items-center bg-[#2a2a3e] rounded-md px-2 py-1">
                                    <span className="text-gray-500 text-sm">#</span>
                                    <input
                                        type="text"
                                        value={textColor.replace('#', '').toUpperCase()}
                                        onChange={(e) => {
                                            const hex = e.target.value.replace(/[^0-9A-Fa-f]/g, '').slice(0, 6);
                                            if (hex.length === 6) {
                                                onColorChange(`#${hex}`);
                                            }
                                        }}
                                        className="flex-1 bg-transparent text-white text-xs font-mono focus:outline-none ml-1"
                                        placeholder="FFFFFF"
                                    />
                                </div>
                            )}
                            
                            {colorFormat === 'HSB' && (
                                <div className="flex items-center gap-1 flex-1">
                                    <div className="flex flex-col items-center">
                                        <input
                                            type="number"
                                            min="0"
                                            max="360"
                                            value={hsb.h}
                                            onChange={(e) => {
                                                const newH = Math.max(0, Math.min(360, parseInt(e.target.value) || 0));
                                                const newRgb = hsbToRgb(newH, hsb.s, hsb.b);
                                                onColorChange(rgbToHex(newRgb.r, newRgb.g, newRgb.b));
                                            }}
                                            className="w-12 bg-[#2a2a3e] text-center text-white text-xs rounded px-1 py-1 focus:outline-none focus:ring-1 focus:ring-[#0ea5e9]"
                                        />
                                        <span className="text-gray-500 text-[10px] mt-0.5">H</span>
                                    </div>
                                    <div className="flex flex-col items-center">
                                        <input
                                            type="number"
                                            min="0"
                                            max="100"
                                            value={hsb.s}
                                            onChange={(e) => {
                                                const newS = Math.max(0, Math.min(100, parseInt(e.target.value) || 0));
                                                const newRgb = hsbToRgb(hsb.h, newS, hsb.b);
                                                onColorChange(rgbToHex(newRgb.r, newRgb.g, newRgb.b));
                                            }}
                                            className="w-12 bg-[#2a2a3e] text-center text-white text-xs rounded px-1 py-1 focus:outline-none focus:ring-1 focus:ring-[#0ea5e9]"
                                        />
                                        <span className="text-gray-500 text-[10px] mt-0.5">S</span>
                                    </div>
                                    <div className="flex flex-col items-center">
                                        <input
                                            type="number"
                                            min="0"
                                            max="100"
                                            value={hsb.b}
                                            onChange={(e) => {
                                                const newB = Math.max(0, Math.min(100, parseInt(e.target.value) || 0));
                                                const newRgb = hsbToRgb(hsb.h, hsb.s, newB);
                                                onColorChange(rgbToHex(newRgb.r, newRgb.g, newRgb.b));
                                            }}
                                            className="w-12 bg-[#2a2a3e] text-center text-white text-xs rounded px-1 py-1 focus:outline-none focus:ring-1 focus:ring-[#0ea5e9]"
                                        />
                                        <span className="text-gray-500 text-[10px] mt-0.5">B</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* B/I/U Buttons */}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onBoldToggle();
                }}
                className={`p-1.5 rounded-md transition-all duration-200 ${
                    isBold ? 'bg-[#4a4a5e] text-white' : 'bg-[#3b3b50] text-gray-400 hover:text-white hover:bg-[#4a4a5e]'
                }`}
            >
                <Bold size={14} />
            </button>
            
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onItalicToggle();
                }}
                className={`p-1.5 rounded-md transition-all duration-200 ${
                    isItalic ? 'bg-[#4a4a5e] text-white' : 'bg-[#3b3b50] text-gray-400 hover:text-white hover:bg-[#4a4a5e]'
                }`}
            >
                <Italic size={14} />
            </button>
            
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onUnderlineToggle();
                }}
                className={`p-1.5 rounded-md transition-all duration-200 ${
                    isUnderline ? 'bg-[#4a4a5e] text-white' : 'bg-[#3b3b50] text-gray-400 hover:text-white hover:bg-[#4a4a5e]'
                }`}
            >
                <Underline size={14} />
            </button>

            {/* Separator */}
            <div className="w-px h-5 bg-[#3a3a5e]" />

            {/* Alignment Dropdown */}
            <div className="flex items-center bg-[#3b3b50] rounded-md p-0.5">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onAlignChange('left');
                    }}
                    className={`p-1 rounded transition-colors ${
                        textAlign === 'left' ? 'bg-[#4a4a5e] text-white' : 'text-gray-400 hover:text-white'
                    }`}
                >
                    <AlignLeft size={12} />
                </button>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onAlignChange('center');
                    }}
                    className={`p-1 rounded transition-colors ${
                        textAlign === 'center' ? 'bg-[#4a4a5e] text-white' : 'text-gray-400 hover:text-white'
                    }`}
                >
                    <AlignCenter size={12} />
                </button>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onAlignChange('right');
                    }}
                    className={`p-1 rounded transition-colors ${
                        textAlign === 'right' ? 'bg-[#4a4a5e] text-white' : 'text-gray-400 hover:text-white'
                    }`}
                >
                    <AlignRight size={12} />
                </button>
            </div>

            {/* Separator */}
            <div className="w-px h-5 bg-[#3a3a5e]" />

            {/* Delete Button */}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                }}
                className="p-1.5 bg-[#3b3b50] hover:bg-red-500/20 text-gray-400 hover:text-red-400 rounded-md transition-all duration-200"
            >
                <Trash2 size={14} />
            </button>
        </div>
    );
};

export default TextEditToolbar;

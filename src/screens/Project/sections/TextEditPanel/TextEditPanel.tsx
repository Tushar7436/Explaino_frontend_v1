import React, { useState, useEffect } from 'react';
import { X, ChevronDown, Minus, Plus, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';

interface TextStyle {
    fontFamily: string;
    fontSize: number;
    fontWeight: string;
    color: string;
    textAlign?: string;
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    background?: {
        enabled?: boolean;
        color: string;
        opacity?: number;
        radius?: number;
        padding?: number;
    };
    outline?: {
        enabled?: boolean;
        thickness?: number;
        width?: number;
        color: string;
    };
    shadow?: {
        enabled?: boolean;
        position?: { x: number; y: number };
        blur?: number;
        color: string;
        opacity?: number;
    };
}

interface TextElement {
    type: string;
    content: string;
    start: number;
    end: number;
    position: { x: number; y: number };
    dimension: { width: number; height: number };
    style: TextStyle;
}

interface TextEditPanelProps {
    isOpen: boolean;
    onClose: () => void;
    element: TextElement | null;
    clipName: string;
    elementIndex: number;
    clipStart: number;
    clipEnd: number;
    onUpdate: (updates: Partial<TextElement>) => void;
    onDelete: () => void;
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

export const TextEditPanel: React.FC<TextEditPanelProps> = ({
    isOpen,
    onClose,
    element,
    clipName: _clipName,
    elementIndex: _elementIndex,
    clipStart: _clipStart,
    clipEnd,
    onUpdate,
    onDelete,
}) => {
    const [activeTab, setActiveTab] = useState<'design' | 'animation'>('design');
    
    // Style dropdowns state
    const [isBackgroundOpen, setIsBackgroundOpen] = useState(false);
    const [isOutlineOpen, setIsOutlineOpen] = useState(false);
    const [isShadowOpen, setIsShadowOpen] = useState(false);
    const [isFontDropdownOpen, setIsFontDropdownOpen] = useState(false);
    const [isWeightDropdownOpen, setIsWeightDropdownOpen] = useState(false);

    // Local state for editing
    const [content, setContent] = useState(element?.content || '');
    const [fontFamily, setFontFamily] = useState(element?.style?.fontFamily || 'Oswald');
    const [fontSize, setFontSize] = useState(element?.style?.fontSize || 129);
    const [fontWeight, setFontWeight] = useState(element?.style?.fontWeight || 'Light');
    const [textColor, setTextColor] = useState(element?.style?.color || '#FFFFFF');
    
    // Style toggles
    const [backgroundEnabled, setBackgroundEnabled] = useState(element?.style?.background?.enabled ?? false);
    const [backgroundColor, setBackgroundColor] = useState(element?.style?.background?.color || '#000000');
    const [backgroundRadius, setBackgroundRadius] = useState(element?.style?.background?.radius || 0);
    const [backgroundPadding, setBackgroundPadding] = useState(element?.style?.background?.padding || 5);
    
    const [outlineEnabled, setOutlineEnabled] = useState(element?.style?.outline?.enabled ?? true);
    const [outlineThickness, setOutlineThickness] = useState(element?.style?.outline?.thickness || element?.style?.outline?.width || 6);
    const [outlineColor, setOutlineColor] = useState(element?.style?.outline?.color || '#000000');
    
    const [shadowEnabled, setShadowEnabled] = useState(element?.style?.shadow?.enabled ?? true);
    const [shadowX, setShadowX] = useState(element?.style?.shadow?.position?.x || 0);
    const [shadowY, setShadowY] = useState(element?.style?.shadow?.position?.y || 0);
    const [shadowBlur, setShadowBlur] = useState(element?.style?.shadow?.blur || 30);
    const [shadowColor, setShadowColor] = useState(element?.style?.shadow?.color || '#000000');
    const [shadowOpacity, setShadowOpacity] = useState(element?.style?.shadow?.opacity || 75);
    
    // Duration state
    const [smartDuration, setSmartDuration] = useState(false);
    const [startTime, setStartTime] = useState(element?.start || 0);
    const [endTime, setEndTime] = useState(element?.end || 3);
    
    // Sync local state when element changes
    useEffect(() => {
        if (element) {
            setContent(element.content || '');
            setFontFamily(element.style?.fontFamily || 'Oswald');
            setFontSize(element.style?.fontSize || 129);
            setFontWeight(element.style?.fontWeight || 'Light');
            setTextColor(element.style?.color || '#FFFFFF');
            
            setBackgroundEnabled(element.style?.background?.enabled ?? false);
            setBackgroundColor(element.style?.background?.color || '#000000');
            setBackgroundRadius(element.style?.background?.radius || 0);
            setBackgroundPadding(element.style?.background?.padding || 5);
            
            setOutlineEnabled(element.style?.outline?.enabled ?? true);
            setOutlineThickness(element.style?.outline?.thickness || element.style?.outline?.width || 6);
            setOutlineColor(element.style?.outline?.color || '#000000');
            
            setShadowEnabled(element.style?.shadow?.enabled ?? true);
            setShadowX(element.style?.shadow?.position?.x || 0);
            setShadowY(element.style?.shadow?.position?.y || 0);
            setShadowBlur(element.style?.shadow?.blur || 30);
            setShadowColor(element.style?.shadow?.color || '#000000');
            setShadowOpacity(element.style?.shadow?.opacity || 75);
            
            setStartTime(element.start || 0);
            setEndTime(element.end || 3);
        }
    }, [element]);

    // Apply updates when values change
    const handleUpdate = () => {
        onUpdate({
            content,
            start: startTime,
            end: endTime,
            style: {
                fontFamily,
                fontSize,
                fontWeight,
                color: textColor,
                background: backgroundEnabled ? {
                    enabled: true,
                    color: backgroundColor,
                    radius: backgroundRadius,
                    padding: backgroundPadding,
                } : undefined,
                outline: outlineEnabled ? {
                    enabled: true,
                    thickness: outlineThickness,
                    width: outlineThickness,
                    color: outlineColor,
                } : undefined,
                shadow: shadowEnabled ? {
                    enabled: true,
                    position: { x: shadowX, y: shadowY },
                    blur: shadowBlur,
                    color: shadowColor,
                    opacity: shadowOpacity,
                } : undefined,
            }
        });
    };

    // Format time to HH:MM:SS
    const formatTime = (seconds: number): string => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    // Keep panel mounted for animations but hide with transform
    const shouldShow = isOpen && element;
    const textDuration = shouldShow ? endTime - startTime : 0;

    // If not open, show a placeholder panel for Elements
    if (!shouldShow) {
        return (
            <div className="w-[360px] bg-gradient-to-b from-[#1e1e2e] to-[#1a1a28] border-r border-white/5 flex flex-col">
                {/* Header */}
                <div className="px-4 py-3 flex items-center justify-between border-b border-white/5">
                    <div className="flex items-center gap-2">
                        <h2 className="text-white font-semibold text-lg">Elements</h2>
                    </div>
                </div>
                
                {/* Empty State */}
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                        <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16m-7 6h7" />
                        </svg>
                    </div>
                    <h3 className="text-white font-medium mb-2">No Element Selected</h3>
                    <p className="text-gray-400 text-sm">
                        Click on a text element in the canvas or timeline to edit its properties.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div data-text-edit-panel="true" className="w-[360px] bg-gradient-to-b from-[#1e1e2e] to-[#1a1a28] border-r border-white/5 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                <div className="flex items-center gap-2">
                    <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all">
                        <X size={16} />
                    </button>
                    <h2 className="text-white font-semibold text-lg">Edit Text</h2>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex px-4 pt-3 gap-2">
                <button
                    onClick={() => setActiveTab('design')}
                    className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                        activeTab === 'design'
                            ? 'bg-[#3b3b50] text-white'
                            : 'bg-transparent text-gray-400 hover:text-white'
                    }`}
                >
                    <span className="flex items-center justify-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <circle cx="12" cy="12" r="10" strokeWidth={2} />
                        </svg>
                        Design
                    </span>
                </button>
                <button
                    onClick={() => setActiveTab('animation')}
                    className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                        activeTab === 'animation'
                            ? 'bg-[#3b3b50] text-white'
                            : 'bg-transparent text-gray-400 hover:text-white'
                    }`}
                >
                    <span className="flex items-center justify-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3l14 9-14 9V3z" />
                        </svg>
                        Animation
                    </span>
                </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-4 py-4">
                {activeTab === 'design' && (
                    <div className="space-y-6">
                        {/* TEXT CONTENT */}
                        <div>
                            <h3 className="text-[11px] text-gray-400 uppercase tracking-wider font-medium mb-2">Text Content</h3>
                            <textarea
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                onBlur={handleUpdate}
                                className="w-full bg-[#2a2a3e] border border-[#3a3a5e] rounded-lg p-3 text-white text-sm resize-none focus:outline-none focus:border-pink-500"
                                rows={3}
                                placeholder="Enter text..."
                            />
                        </div>

                        {/* TYPOGRAPHY */}
                        <div>
                            <h3 className="text-[11px] text-gray-400 uppercase tracking-wider font-medium mb-3">Typography</h3>
                            
                            {/* Font Family & Size Row */}
                            <div className="flex gap-2 mb-3">
                                {/* Font Family Dropdown */}
                                <div className="relative flex-1">
                                    <button
                                        onClick={() => setIsFontDropdownOpen(!isFontDropdownOpen)}
                                        className="w-full flex items-center justify-between bg-[#2a2a3e] border border-[#3a3a5e] rounded-lg px-3 py-2 text-white text-sm hover:border-pink-500/50 transition-colors"
                                    >
                                        <span>{fontFamily}</span>
                                        <ChevronDown size={14} className="text-gray-400" />
                                    </button>
                                    {isFontDropdownOpen && (
                                        <div className="absolute top-full left-0 right-0 mt-1 bg-[#1a1a2e] border border-[#3a3a5e] rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto">
                                            {FONT_OPTIONS.map((font) => (
                                                <button
                                                    key={font}
                                                    onClick={() => {
                                                        setFontFamily(font);
                                                        setIsFontDropdownOpen(false);
                                                        setTimeout(handleUpdate, 0);
                                                    }}
                                                    className="w-full text-left px-3 py-2 text-sm text-white hover:bg-white/10 transition-colors"
                                                    style={{ fontFamily: font }}
                                                >
                                                    {font}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                
                                {/* Font Size */}
                                <div className="flex items-center bg-[#2a2a3e] border border-[#3a3a5e] rounded-lg">
                                    <button
                                        onClick={() => { setFontSize(prev => Math.max(10, prev - 1)); setTimeout(handleUpdate, 0); }}
                                        className="px-2 py-2 text-gray-400 hover:text-white transition-colors"
                                    >
                                        <Minus size={14} />
                                    </button>
                                    <input
                                        type="number"
                                        value={fontSize}
                                        onChange={(e) => {
                                            const newSize = Number(e.target.value);
                                            if (newSize >= 10) {
                                                setFontSize(newSize);
                                                setTimeout(handleUpdate, 0);
                                            }
                                        }}
                                        onBlur={handleUpdate}
                                        className="w-12 bg-transparent text-center text-white text-sm focus:outline-none"
                                    />
                                    <span className="text-gray-400 text-sm pr-1">px</span>
                                    <button
                                        onClick={() => { setFontSize(prev => prev + 1); setTimeout(handleUpdate, 0); }}
                                        className="px-2 py-2 text-gray-400 hover:text-white transition-colors"
                                    >
                                        <Plus size={14} />
                                    </button>
                                </div>
                            </div>

                            {/* Font Weight & Formatting Row */}
                            <div className="flex gap-2 mb-3">
                                {/* Font Weight Dropdown */}
                                <div className="relative">
                                    <button
                                        onClick={() => setIsWeightDropdownOpen(!isWeightDropdownOpen)}
                                        className="flex items-center gap-2 bg-[#2a2a3e] border border-[#3a3a5e] rounded-lg px-3 py-2 text-white text-sm hover:border-pink-500/50 transition-colors"
                                    >
                                        <div className="w-4 h-4 bg-white rounded-full" />
                                        <span>{fontWeight}</span>
                                        <ChevronDown size={14} className="text-gray-400" />
                                    </button>
                                    {isWeightDropdownOpen && (
                                        <div className="absolute top-full left-0 mt-1 bg-[#1a1a2e] border border-[#3a3a5e] rounded-lg shadow-xl z-50 min-w-[120px]">
                                            {FONT_WEIGHTS.map((weight) => (
                                                <button
                                                    key={weight.value}
                                                    onClick={() => {
                                                        setFontWeight(weight.value);
                                                        setIsWeightDropdownOpen(false);
                                                        setTimeout(handleUpdate, 0);
                                                    }}
                                                    className="w-full text-left px-3 py-2 text-sm text-white hover:bg-white/10 transition-colors"
                                                >
                                                    {weight.label}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                
                                {/* B/I/U Buttons */}
                                <div className="flex items-center gap-1">
                                    <button className="p-2 bg-[#2a2a3e] border border-[#3a3a5e] rounded-lg text-white hover:bg-[#3a3a5e] transition-colors font-bold">
                                        B
                                    </button>
                                    <button className="p-2 bg-[#2a2a3e] border border-[#3a3a5e] rounded-lg text-white hover:bg-[#3a3a5e] transition-colors italic">
                                        I
                                    </button>
                                    <button className="p-2 bg-[#2a2a3e] border border-[#3a3a5e] rounded-lg text-white hover:bg-[#3a3a5e] transition-colors underline">
                                        U
                                    </button>
                                </div>
                            </div>

                            {/* Alignment & Spacing Row */}
                            <div className="flex gap-2">
                                <div className="flex items-center gap-1 bg-[#2a2a3e] border border-[#3a3a5e] rounded-lg p-1">
                                    <button className="p-1.5 hover:bg-white/10 rounded transition-colors">
                                        <AlignLeft size={16} className="text-white" />
                                    </button>
                                    <button className="p-1.5 hover:bg-white/10 rounded transition-colors bg-white/10">
                                        <AlignCenter size={16} className="text-white" />
                                    </button>
                                    <button className="p-1.5 hover:bg-white/10 rounded transition-colors">
                                        <AlignRight size={16} className="text-white" />
                                    </button>
                                </div>
                                
                                <button className="flex items-center gap-2 bg-[#2a2a3e] border border-[#3a3a5e] rounded-lg px-3 py-2 text-white text-sm hover:border-pink-500/50 transition-colors">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                    </svg>
                                    Spacing
                                    <ChevronDown size={14} className="text-gray-400" />
                                </button>
                            </div>
                        </div>

                        {/* STYLE */}
                        <div>
                            <h3 className="text-[11px] text-gray-400 uppercase tracking-wider font-medium mb-3">Style</h3>
                            <div className="flex gap-2">
                                {/* Background Button */}
                                <button
                                    onClick={() => { setIsBackgroundOpen(!isBackgroundOpen); setIsOutlineOpen(false); setIsShadowOpen(false); }}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                                        isBackgroundOpen ? 'bg-[#3b3b50] text-white' : 'bg-[#2a2a3e] text-white hover:bg-[#3a3a5e]'
                                    }`}
                                >
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                        <rect x="3" y="3" width="18" height="18" rx="2" />
                                    </svg>
                                    Background
                                    <ChevronDown size={12} className="text-gray-400" />
                                </button>
                                
                                {/* Outline Button */}
                                <button
                                    onClick={() => { setIsOutlineOpen(!isOutlineOpen); setIsBackgroundOpen(false); setIsShadowOpen(false); }}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                                        isOutlineOpen ? 'bg-[#3b3b50] text-white' : 'bg-[#2a2a3e] text-white hover:bg-[#3a3a5e]'
                                    }`}
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h8m-8 6h16" />
                                    </svg>
                                    Outline
                                    <ChevronDown size={12} className="text-gray-400" />
                                </button>
                                
                                {/* Shadow Button */}
                                <button
                                    onClick={() => { setIsShadowOpen(!isShadowOpen); setIsBackgroundOpen(false); setIsOutlineOpen(false); }}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                                        isShadowOpen ? 'bg-[#3b3b50] text-white' : 'bg-[#2a2a3e] text-white hover:bg-[#3a3a5e]'
                                    }`}
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <circle cx="12" cy="12" r="5" strokeWidth={2} />
                                    </svg>
                                    Shadow
                                    <ChevronDown size={12} className="text-gray-400" />
                                </button>
                            </div>

                            {/* Background Panel */}
                            {isBackgroundOpen && (
                                <div className="mt-3 p-4 bg-[#2a2a3e] rounded-lg space-y-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-white text-sm">Background</span>
                                        <button
                                            onClick={() => { setBackgroundEnabled(!backgroundEnabled); setTimeout(handleUpdate, 0); }}
                                            className={`w-10 h-5 rounded-full transition-colors ${backgroundEnabled ? 'bg-pink-500' : 'bg-gray-600'}`}
                                        >
                                            <div className={`w-4 h-4 bg-white rounded-full transition-transform ${backgroundEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                                        </button>
                                    </div>
                                    
                                    {backgroundEnabled && (
                                        <>
                                            {/* Color Picker */}
                                            <div className="flex items-center gap-3">
                                                <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                                                    <circle cx="12" cy="12" r="10" />
                                                </svg>
                                                <span className="text-white text-sm">Color</span>
                                                <input
                                                    type="color"
                                                    value={backgroundColor}
                                                    onChange={(e) => { setBackgroundColor(e.target.value); setTimeout(handleUpdate, 0); }}
                                                    className="w-6 h-6 rounded cursor-pointer"
                                                />
                                                <input
                                                    type="text"
                                                    value={backgroundColor.toUpperCase().replace('#', '')}
                                                    onChange={(e) => { setBackgroundColor(`#${e.target.value}`); }}
                                                    onBlur={handleUpdate}
                                                    className="flex-1 bg-[#1a1a2e] border border-[#3a3a5e] rounded px-2 py-1 text-white text-sm"
                                                />
                                            </div>
                                            
                                            {/* Radius */}
                                            <div className="flex items-center gap-3">
                                                <span className="text-white text-sm flex-1">Radius</span>
                                                <input
                                                    type="range"
                                                    min="0"
                                                    max="50"
                                                    value={backgroundRadius}
                                                    onChange={(e) => { setBackgroundRadius(Number(e.target.value)); }}
                                                    onMouseUp={handleUpdate}
                                                    className="flex-1 accent-pink-500"
                                                />
                                                <span className="text-white text-sm w-12 text-right">{backgroundRadius} %</span>
                                            </div>
                                            
                                            {/* Padding */}
                                            <div className="flex items-center gap-3">
                                                <span className="text-white text-sm flex-1">Padding</span>
                                                <input
                                                    type="range"
                                                    min="0"
                                                    max="50"
                                                    value={backgroundPadding}
                                                    onChange={(e) => { setBackgroundPadding(Number(e.target.value)); }}
                                                    onMouseUp={handleUpdate}
                                                    className="flex-1 accent-pink-500"
                                                />
                                                <span className="text-white text-sm w-12 text-right">{backgroundPadding} %</span>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}

                            {/* Outline Panel */}
                            {isOutlineOpen && (
                                <div className="mt-3 p-4 bg-[#2a2a3e] rounded-lg space-y-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-white text-sm">Outline</span>
                                        <button
                                            onClick={() => { setOutlineEnabled(!outlineEnabled); setTimeout(handleUpdate, 0); }}
                                            className={`w-10 h-5 rounded-full transition-colors ${outlineEnabled ? 'bg-pink-500' : 'bg-gray-600'}`}
                                        >
                                            <div className={`w-4 h-4 bg-white rounded-full transition-transform ${outlineEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                                        </button>
                                    </div>
                                    
                                    {outlineEnabled && (
                                        <>
                                            {/* Thickness */}
                                            <div className="flex items-center gap-3">
                                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                                                </svg>
                                                <span className="text-white text-sm">Thickness</span>
                                                <input
                                                    type="range"
                                                    min="1"
                                                    max="20"
                                                    value={outlineThickness}
                                                    onChange={(e) => { setOutlineThickness(Number(e.target.value)); }}
                                                    onMouseUp={handleUpdate}
                                                    className="flex-1 accent-pink-500"
                                                />
                                                <span className="text-white text-sm w-8 text-right">{outlineThickness}</span>
                                            </div>
                                            
                                            {/* Color */}
                                            <div className="flex items-center gap-3">
                                                <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                                                    <circle cx="12" cy="12" r="10" />
                                                </svg>
                                                <span className="text-white text-sm">Color</span>
                                                <input
                                                    type="color"
                                                    value={outlineColor}
                                                    onChange={(e) => { setOutlineColor(e.target.value); setTimeout(handleUpdate, 0); }}
                                                    className="w-6 h-6 rounded cursor-pointer"
                                                />
                                                <span className="text-white text-sm">{outlineColor.toUpperCase()}</span>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}

                            {/* Shadow Panel */}
                            {isShadowOpen && (
                                <div className="mt-3 p-4 bg-[#2a2a3e] rounded-lg space-y-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-white text-sm">Shadow</span>
                                        <button
                                            onClick={() => { setShadowEnabled(!shadowEnabled); setTimeout(handleUpdate, 0); }}
                                            className={`w-10 h-5 rounded-full transition-colors ${shadowEnabled ? 'bg-pink-500' : 'bg-gray-600'}`}
                                        >
                                            <div className={`w-4 h-4 bg-white rounded-full transition-transform ${shadowEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                                        </button>
                                    </div>
                                    
                                    {shadowEnabled && (
                                        <>
                                            {/* Position */}
                                            <div className="flex items-center gap-3">
                                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m-12 5h12m-12 5h12" />
                                                </svg>
                                                <span className="text-white text-sm">Position</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-gray-400 text-sm">X:</span>
                                                    <input
                                                        type="number"
                                                        value={shadowX}
                                                        onChange={(e) => setShadowX(Number(e.target.value))}
                                                        onBlur={handleUpdate}
                                                        className="w-12 bg-[#1a1a2e] border border-[#3a3a5e] rounded px-2 py-1 text-white text-sm text-center"
                                                    />
                                                    <span className="text-gray-400 text-sm">Y:</span>
                                                    <input
                                                        type="number"
                                                        value={shadowY}
                                                        onChange={(e) => setShadowY(Number(e.target.value))}
                                                        onBlur={handleUpdate}
                                                        className="w-12 bg-[#1a1a2e] border border-[#3a3a5e] rounded px-2 py-1 text-white text-sm text-center"
                                                    />
                                                </div>
                                            </div>
                                            
                                            {/* Blur */}
                                            <div className="flex items-center gap-3">
                                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                                </svg>
                                                <span className="text-white text-sm">Blur</span>
                                                <input
                                                    type="range"
                                                    min="0"
                                                    max="100"
                                                    value={shadowBlur}
                                                    onChange={(e) => setShadowBlur(Number(e.target.value))}
                                                    onMouseUp={handleUpdate}
                                                    className="flex-1 accent-pink-500"
                                                />
                                                <span className="text-white text-sm w-8 text-right">{shadowBlur}</span>
                                            </div>
                                            
                                            {/* Color & Opacity */}
                                            <div className="flex items-center gap-3">
                                                <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                                                    <circle cx="12" cy="12" r="10" />
                                                </svg>
                                                <span className="text-white text-sm">Color</span>
                                                <input
                                                    type="color"
                                                    value={shadowColor}
                                                    onChange={(e) => { setShadowColor(e.target.value); setTimeout(handleUpdate, 0); }}
                                                    className="w-6 h-6 rounded cursor-pointer"
                                                />
                                                <span className="text-white text-sm">{shadowColor.toUpperCase()}</span>
                                                <span className="text-white text-sm ml-2">{shadowOpacity} %</span>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* DURATION */}
                        <div>
                            <h3 className="text-[11px] text-gray-400 uppercase tracking-wider font-medium mb-3">Duration</h3>
                            
                            {/* Smart Duration Toggle */}
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <span className="text-white text-sm">Smart Duration</span>
                                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <circle cx="12" cy="12" r="10" strokeWidth={2} />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 16v-4m0-4h.01" />
                                    </svg>
                                </div>
                                <button
                                    onClick={() => setSmartDuration(!smartDuration)}
                                    className={`w-10 h-5 rounded-full transition-colors ${smartDuration ? 'bg-pink-500' : 'bg-gray-600'}`}
                                >
                                    <div className={`w-4 h-4 bg-white rounded-full transition-transform ${smartDuration ? 'translate-x-5' : 'translate-x-0.5'}`} />
                                </button>
                            </div>
                            
                            {/* Start & End Time */}
                            <div className="flex items-center gap-4 mb-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <circle cx="12" cy="12" r="10" strokeWidth={2} />
                                        </svg>
                                        <span>Start</span>
                                    </div>
                                    <div className="bg-[#2a2a3e] border border-[#3a3a5e] rounded-lg px-3 py-2 text-white text-sm">
                                        {formatTime(startTime)}
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                                        <span>End</span>
                                    </div>
                                    <div className="flex items-center bg-[#2a2a3e] border border-[#3a3a5e] rounded-lg px-3 py-2 text-white text-sm">
                                        {formatTime(endTime)}
                                        <svg className="w-4 h-4 ml-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <circle cx="12" cy="12" r="10" strokeWidth={2} />
                                        </svg>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Textbox Duration */}
                            <div className="flex items-center justify-between">
                                <span className="text-white text-sm">Textbox Duration</span>
                                <div className="flex items-center bg-[#2a2a3e] border border-[#3a3a5e] rounded-lg">
                                    <button
                                        onClick={() => { 
                                            const newEnd = Math.max(startTime + 0.5, endTime - 1);
                                            setEndTime(newEnd);
                                            setTimeout(handleUpdate, 0);
                                        }}
                                        className="px-2 py-1 text-gray-400 hover:text-white transition-colors"
                                    >
                                        <Minus size={14} />
                                    </button>
                                    <span className="px-3 text-white text-sm">{Math.round(textDuration)}</span>
                                    <span className="text-gray-400 text-sm pr-2">s</span>
                                    <button
                                        onClick={() => {
                                            const newEnd = Math.min(clipEnd, endTime + 1);
                                            setEndTime(newEnd);
                                            setTimeout(handleUpdate, 0);
                                        }}
                                        className="px-2 py-1 text-gray-400 hover:text-white transition-colors"
                                    >
                                        <Plus size={14} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'animation' && (
                    <div className="text-gray-400 text-center py-8">
                        Animation options coming soon
                    </div>
                )}
            </div>

            {/* Delete Button */}
            <div className="p-4 border-t border-[#2a2a3e]">
                <button
                    onClick={onDelete}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-transparent border border-red-500/50 text-red-400 rounded-lg hover:bg-red-500/10 transition-colors"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete
                </button>
            </div>
        </div>
    );
};

export default TextEditPanel;

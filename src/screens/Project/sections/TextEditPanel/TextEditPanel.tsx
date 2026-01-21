import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, ChevronDown, Minus, Plus, AlignLeft, AlignCenter, AlignRight, Bold, Italic, Underline, Type, Sparkles } from 'lucide-react';

interface TextStyle {
    fontFamily: string;
    fontSize: number;
    fontWeight: string;
    fontStyle?: string;
    textDecoration?: string;
    textAlign?: string;
    lineHeight?: number;
    letterSpacing?: number;
    color: string;
    background?: {
        enabled?: boolean;
        color: string;
        opacity?: number;
        borderRadius?: number;
        padding?: number;
    };
    outline?: {
        enabled?: boolean;
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

// Font options
const FONT_OPTIONS = [
    'Funnel Display',
    'Oswald',
    'Inter',
    'Roboto',
    'Montserrat',
    'Poppins',
    'Open Sans',
    'Lato',
    'Nunito',
    'Raleway',
    'Playfair Display',
    'Merriweather',
    'Bebas Neue',
    'Anton',
    'Dancing Script',
    'Pacifico',
    'Arial',
    'Helvetica',
    'Georgia',
    'Times New Roman',
];

const FONT_WEIGHTS = [
    { label: 'Light', value: 'Light' },
    { label: 'Regular', value: 'Regular' },
    { label: 'Medium', value: 'Medium' },
    { label: 'Semi Bold', value: 'SemiBold' },
    { label: 'Bold', value: 'Bold' },
    { label: 'Extra Bold', value: 'ExtraBold' },
];

export const TextEditPanel: React.FC<TextEditPanelProps> = ({
    isOpen,
    onClose,
    element,
    clipStart,
    clipEnd,
    onUpdate,
    onDelete,
}) => {
    const [activeTab, setActiveTab] = useState<'design' | 'animation'>('design');
    
    // Dropdown states
    const [isFontDropdownOpen, setIsFontDropdownOpen] = useState(false);
    const [isWeightDropdownOpen, setIsWeightDropdownOpen] = useState(false);
    const [isSpacingOpen, setIsSpacingOpen] = useState(false);
    const [isBackgroundOpen, setIsBackgroundOpen] = useState(false);
    const [isOutlineOpen, setIsOutlineOpen] = useState(false);
    const [isShadowOpen, setIsShadowOpen] = useState(false);

    // Local state only for controlled inputs (text area, sliders during drag)
    const [localContent, setLocalContent] = useState(element?.content || '');
    const [localLineHeight, setLocalLineHeight] = useState(element?.style?.lineHeight || 1.1);
    const [localLetterSpacing, setLocalLetterSpacing] = useState(element?.style?.letterSpacing || 0);
    const [localShadowOpacity, setLocalShadowOpacity] = useState(element?.style?.shadow?.opacity || 75);
    const [localBackgroundOpacity, setLocalBackgroundOpacity] = useState(element?.style?.background?.opacity ?? 100);

    // Refs for click outside handling
    const fontDropdownRef = useRef<HTMLDivElement>(null);
    const weightDropdownRef = useRef<HTMLDivElement>(null);
    const spacingDropdownRef = useRef<HTMLDivElement>(null);
    
    // Track if we're currently focused on the textarea (to avoid overwriting while typing)
    const [isTextareaFocused, setIsTextareaFocused] = useState(false);

    // Sync local state when element changes (only if textarea is not focused)
    useEffect(() => {
        if (element) {
            // Only update content if we're not actively editing in the textarea
            if (!isTextareaFocused && element.content !== localContent) {
                setLocalContent(element.content || '');
            }
            setLocalLineHeight(element.style?.lineHeight || 1.1);
            setLocalLetterSpacing(element.style?.letterSpacing || 0);
            setLocalShadowOpacity(element.style?.shadow?.opacity || 75);
            setLocalBackgroundOpacity(element.style?.background?.opacity ?? 100);
        }
    }, [element, element?.content, isTextareaFocused]);

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (fontDropdownRef.current && !fontDropdownRef.current.contains(event.target as Node)) {
                setIsFontDropdownOpen(false);
            }
            if (weightDropdownRef.current && !weightDropdownRef.current.contains(event.target as Node)) {
                setIsWeightDropdownOpen(false);
            }
            if (spacingDropdownRef.current && !spacingDropdownRef.current.contains(event.target as Node)) {
                setIsSpacingOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Helper to update style properties
    const updateStyle = useCallback((styleUpdates: Partial<TextStyle>) => {
        if (!element) return;
        console.log('[TextEditPanel] Updating style:', styleUpdates);
        onUpdate({ style: { ...element.style, ...styleUpdates } });
    }, [element, onUpdate]);

    // Helper to update nested style objects
    const updateOutline = useCallback((outlineUpdates: Partial<NonNullable<TextStyle['outline']>>) => {
        if (!element) return;
        const currentOutline = element.style?.outline || { enabled: true, width: 6, color: '#000000' };
        console.log('[TextEditPanel] Updating outline:', outlineUpdates);
        onUpdate({ 
            style: { 
                ...element.style, 
                outline: { ...currentOutline, ...outlineUpdates } 
            } 
        });
    }, [element, onUpdate]);

    const updateShadow = useCallback((shadowUpdates: Partial<NonNullable<TextStyle['shadow']>>) => {
        if (!element) return;
        const currentShadow = element.style?.shadow || { enabled: true, position: { x: 0, y: 0 }, blur: 30, color: '#000000', opacity: 75 };
        console.log('[TextEditPanel] Updating shadow:', shadowUpdates);
        onUpdate({ 
            style: { 
                ...element.style, 
                shadow: { ...currentShadow, ...shadowUpdates } 
            } 
        });
    }, [element, onUpdate]);

    const updateBackground = useCallback((backgroundUpdates: Partial<NonNullable<TextStyle['background']>>) => {
        if (!element) return;
        const currentBackground = element.style?.background || { enabled: false, color: '#D0B2B2', opacity: 100, borderRadius: 0, padding: 5 };
        console.log('[TextEditPanel] Updating background:', backgroundUpdates);
        onUpdate({ 
            style: { 
                ...element.style, 
                background: { ...currentBackground, ...backgroundUpdates } 
            } 
        });
    }, [element, onUpdate]);

    // Format time to HH:MM:SS.ms
    const formatTime = (seconds: number): string => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        const ms = Math.round((seconds % 1) * 100);
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
    };

    // Read values directly from element prop
    const style = element?.style;
    const fontFamily = style?.fontFamily || 'Funnel Display';
    const fontSize = style?.fontSize || 126;
    const fontWeight = style?.fontWeight || 'Regular';
    const isBold = fontWeight === 'Bold' || fontWeight === 'SemiBold' || fontWeight === 'ExtraBold';
    const isItalic = style?.fontStyle === 'italic';
    const isUnderline = style?.textDecoration === 'underline';
    const textAlign = style?.textAlign || 'center';
    const textColor = style?.color || '#FFFFFF';

    const outlineEnabled = style?.outline?.enabled ?? true;
    const outlineThickness = style?.outline?.width || 2;
    const outlineColor = style?.outline?.color || '#000000';

    const shadowEnabled = style?.shadow?.enabled ?? true;
    const shadowX = style?.shadow?.position?.x || 0;
    const shadowY = style?.shadow?.position?.y || 0;
    const shadowBlur = style?.shadow?.blur || 0;
    const shadowColor = style?.shadow?.color || '#000000';

    const backgroundEnabled = style?.background?.enabled ?? false;
    const backgroundColor = style?.background?.color || '#C14B8A';
    const backgroundRadius = style?.background?.borderRadius || 16;
    const backgroundPadding = style?.background?.padding || 0;

    const startTime = element?.start || 0;
    const endTime = element?.end || 3;
    const textDuration = endTime - startTime;

    const shouldShow = isOpen && element;

    // Empty state
    if (!shouldShow) {
        return (
            <div className="w-[360px] bg-gradient-to-b from-[#1e1e2e] to-[#1a1a28] border-r border-white/5 flex flex-col">
                <div className="px-4 py-3 border-b border-white/10">
                    <h2 className="text-white font-medium text-sm">Elements</h2>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3">
                        <Type size={20} className="text-gray-500" />
                    </div>
                    <h3 className="text-white font-medium text-sm mb-1">No Element Selected</h3>
                    <p className="text-gray-500 text-xs">
                        Click on a text element to edit
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div data-text-edit-panel="true" className="w-[360px] bg-gradient-to-b from-[#1e1e2e] to-[#1a1a28] border-r border-white/5 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                <h2 className="text-white font-medium text-sm">Edit Text</h2>
                <button 
                    onClick={onClose} 
                    className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                >
                    <X size={16} />
                </button>
            </div>

            {/* Tabs */}
            <div className="flex mx-4 mt-3 bg-[#1a1a24] rounded-lg p-1">
                <button
                    onClick={() => setActiveTab('design')}
                    className={`flex-1 py-2 px-4 rounded-md text-xs font-medium transition-all flex items-center justify-center gap-2 ${
                        activeTab === 'design'
                            ? 'bg-[#2a2a3a] text-white'
                            : 'text-gray-400 hover:text-white'
                    }`}
                >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="3" />
                        <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                    </svg>
                    Design
                </button>
                <button
                    onClick={() => setActiveTab('animation')}
                    className={`flex-1 py-2 px-4 rounded-md text-xs font-medium transition-all flex items-center justify-center gap-2 ${
                        activeTab === 'animation'
                            ? 'bg-[#2a2a3a] text-white'
                            : 'text-gray-400 hover:text-white'
                    }`}
                >
                    <Sparkles size={16} />
                    Animation
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
                {activeTab === 'design' && (
                    <div className="p-4 space-y-5">
                        {/* TEXT CONTENT */}
                        <div>
                            <label className="text-[10px] text-gray-400 uppercase tracking-wider font-medium mb-2 block">
                                Text Content
                            </label>
                            <textarea
                                value={localContent}
                                onChange={(e) => {
                                    setLocalContent(e.target.value);
                                    // Update in real-time
                                    onUpdate({ content: e.target.value });
                                }}
                                onFocus={() => setIsTextareaFocused(true)}
                                onBlur={() => setIsTextareaFocused(false)}
                                className="w-full bg-[#1a1a24] border border-white/10 rounded-lg px-4 py-3 text-white text-sm resize-none focus:outline-none focus:border-pink-500/50 transition-colors"
                                rows={2}
                                placeholder="Enter text..."
                            />
                        </div>

                        {/* TYPOGRAPHY */}
                        <div>
                            <label className="text-[10px] text-gray-400 uppercase tracking-wider font-medium mb-3 block">
                                Typography
                            </label>
                            
                            {/* Font Family & Size */}
                            <div className="flex gap-2 mb-3">
                                {/* Font Family */}
                                <div className="relative flex-1" ref={fontDropdownRef}>
                                    <button
                                        onClick={() => { setIsFontDropdownOpen(!isFontDropdownOpen); setIsWeightDropdownOpen(false); }}
                                        className="w-full flex items-center justify-between bg-[#1a1a24] border border-white/10 rounded-lg px-3 py-2 text-white text-sm hover:border-white/20 transition-colors"
                                    >
                                        <span className="truncate">{fontFamily}</span>
                                        <ChevronDown size={14} className="text-gray-400 flex-shrink-0 ml-2" />
                                    </button>
                                    {isFontDropdownOpen && (
                                        <div className="absolute top-full left-0 right-0 mt-1 bg-[#1a1a24] border border-white/10 rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto" data-dropdown="true">
                                            {FONT_OPTIONS.map((font) => (
                                                <button
                                                    key={font}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        e.preventDefault();
                                                        updateStyle({ fontFamily: font });
                                                        setIsFontDropdownOpen(false);
                                                    }}
                                                    onMouseDown={(e) => e.stopPropagation()}
                                                    className={`w-full text-left px-3 py-2 text-sm hover:bg-white/5 transition-colors ${
                                                        fontFamily === font ? 'text-pink-400 bg-white/5' : 'text-white'
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
                                <div className="flex items-center bg-[#1a1a24] border border-white/10 rounded-lg">
                                    <button
                                        onClick={() => updateStyle({ fontSize: Math.max(10, fontSize - 2) })}
                                        className="px-2 py-2 text-gray-400 hover:text-white transition-colors"
                                    >
                                        <Minus size={14} />
                                    </button>
                                    <input
                                        type="number"
                                        value={fontSize}
                                        onChange={(e) => updateStyle({ fontSize: Number(e.target.value) })}
                                        className="w-12 bg-transparent text-center text-white text-sm focus:outline-none"
                                    />
                                    <span className="text-gray-500 text-sm pr-1">px</span>
                                    <button
                                        onClick={() => updateStyle({ fontSize: fontSize + 2 })}
                                        className="px-2 py-2 text-gray-400 hover:text-white transition-colors"
                                    >
                                        <Plus size={14} />
                                    </button>
                                </div>
                            </div>

                            {/* Color & Font Weight & B/I/U */}
                            <div className="flex gap-2 mb-3">
                                {/* Color Picker - styled like toolbar */}
                                <div className="relative flex items-center">
                                    <label className="w-7 h-7 rounded-full cursor-pointer border border-white/20 flex-shrink-0 overflow-hidden" style={{ backgroundColor: textColor }}>
                                        <input
                                            type="color"
                                            value={textColor}
                                            onChange={(e) => updateStyle({ color: e.target.value })}
                                            className="opacity-0 w-full h-full cursor-pointer"
                                        />
                                    </label>
                                </div>

                                {/* Font Weight Dropdown */}
                                <div className="relative flex-1" ref={weightDropdownRef}>
                                    <button
                                        onClick={() => { setIsWeightDropdownOpen(!isWeightDropdownOpen); setIsFontDropdownOpen(false); }}
                                        className="w-full flex items-center justify-between bg-[#1a1a24] border border-white/10 rounded-lg px-3 py-2 text-white text-sm hover:border-white/20 transition-colors h-10"
                                    >
                                        <span>{FONT_WEIGHTS.find(w => w.value === fontWeight)?.label || fontWeight}</span>
                                        <ChevronDown size={14} className="text-gray-400" />
                                    </button>
                                    {isWeightDropdownOpen && (
                                        <div className="absolute top-full left-0 right-0 mt-1 bg-[#1a1a24] border border-white/10 rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto" data-dropdown="true">
                                            {FONT_WEIGHTS.map((weight) => (
                                                <button
                                                    key={weight.value}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        e.preventDefault();
                                                        updateStyle({ fontWeight: weight.value });
                                                        setIsWeightDropdownOpen(false);
                                                    }}
                                                    onMouseDown={(e) => e.stopPropagation()}
                                                    className={`w-full text-left px-3 py-2 text-sm hover:bg-white/5 transition-colors ${
                                                        fontWeight === weight.value ? 'text-pink-400 bg-white/5' : 'text-white'
                                                    }`}
                                                >
                                                    {weight.label}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* B/I/U Buttons */}
                                <div className="flex items-center bg-[#1a1a24] border border-white/10 rounded-lg">
                                    <button
                                        onClick={() => updateStyle({ fontWeight: isBold ? 'Regular' : 'Bold' })}
                                        className={`p-2 transition-colors ${isBold ? 'text-pink-400 bg-white/5' : 'text-white hover:text-pink-400'}`}
                                        title="Bold"
                                    >
                                        <Bold size={16} />
                                    </button>
                                    <button
                                        onClick={() => updateStyle({ fontStyle: isItalic ? 'normal' : 'italic' })}
                                        className={`p-2 transition-colors ${isItalic ? 'text-pink-400 bg-white/5' : 'text-white hover:text-pink-400'}`}
                                        title="Italic"
                                    >
                                        <Italic size={16} />
                                    </button>
                                    <button
                                        onClick={() => updateStyle({ textDecoration: isUnderline ? 'none' : 'underline' })}
                                        className={`p-2 transition-colors ${isUnderline ? 'text-pink-400 bg-white/5' : 'text-white hover:text-pink-400'}`}
                                        title="Underline"
                                    >
                                        <Underline size={16} />
                                    </button>
                                </div>
                            </div>

                            {/* Alignment & Spacing */}
                            <div className="flex gap-2">
                                {/* Alignment */}
                                <div className="flex items-center bg-[#1a1a24] border border-white/10 rounded-lg">
                                    <button
                                        onClick={() => updateStyle({ textAlign: 'left' })}
                                        className={`p-2 transition-colors ${textAlign === 'left' ? 'text-pink-400 bg-white/5' : 'text-white hover:text-pink-400'}`}
                                        title="Align Left"
                                    >
                                        <AlignLeft size={16} />
                                    </button>
                                    <button
                                        onClick={() => updateStyle({ textAlign: 'center' })}
                                        className={`p-2 transition-colors ${textAlign === 'center' ? 'text-pink-400 bg-white/5' : 'text-white hover:text-pink-400'}`}
                                        title="Align Center"
                                    >
                                        <AlignCenter size={16} />
                                    </button>
                                    <button
                                        onClick={() => updateStyle({ textAlign: 'right' })}
                                        className={`p-2 transition-colors ${textAlign === 'right' ? 'text-pink-400 bg-white/5' : 'text-white hover:text-pink-400'}`}
                                        title="Align Right"
                                    >
                                        <AlignRight size={16} />
                                    </button>
                                </div>

                                {/* Spacing Dropdown */}
                                <div className="relative flex-1" ref={spacingDropdownRef}>
                                    <button
                                        onClick={() => setIsSpacingOpen(!isSpacingOpen)}
                                        className={`w-full flex items-center justify-center gap-2 bg-[#1a1a24] border border-white/10 rounded-lg px-3 py-2 text-white text-sm hover:border-white/20 transition-colors ${isSpacingOpen ? 'border-pink-500/50' : ''}`}
                                    >
                                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M4 6h16M4 12h16M4 18h16" />
                                        </svg>
                                        Spacing
                                        <ChevronDown size={14} className="text-gray-400" />
                                    </button>
                                    {isSpacingOpen && (
                                        <div className="absolute top-full left-0 right-0 mt-1 bg-[#1a1a24] border border-white/10 rounded-lg shadow-xl z-50 p-4 space-y-4">
                                            <div className="text-sm text-white font-medium mb-3">Spacing</div>
                                            {/* Line Height */}
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-gray-400 text-xs">Line Height</span>
                                                    <span className="text-white text-xs">{localLineHeight.toFixed(1)}x</span>
                                                </div>
                                                <input
                                                    type="range"
                                                    min="0.8"
                                                    max="2.5"
                                                    step="0.1"
                                                    value={localLineHeight}
                                                    onChange={(e) => setLocalLineHeight(Number(e.target.value))}
                                                    onMouseUp={() => updateStyle({ lineHeight: localLineHeight })}
                                                    onTouchEnd={() => updateStyle({ lineHeight: localLineHeight })}
                                                    className="w-full accent-pink-500 h-1.5"
                                                />
                                            </div>
                                            {/* Letter Spacing */}
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-gray-400 text-xs">Letter Spacing</span>
                                                    <span className="text-white text-xs">{localLetterSpacing}%</span>
                                                </div>
                                                <input
                                                    type="range"
                                                    min="-5"
                                                    max="30"
                                                    step="1"
                                                    value={localLetterSpacing}
                                                    onChange={(e) => setLocalLetterSpacing(Number(e.target.value))}
                                                    onMouseUp={() => updateStyle({ letterSpacing: localLetterSpacing })}
                                                    onTouchEnd={() => updateStyle({ letterSpacing: localLetterSpacing })}
                                                    className="w-full accent-pink-500 h-1.5"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* STYLE */}
                        <div>
                            <label className="text-[10px] text-gray-400 uppercase tracking-wider font-medium mb-3 block">
                                Style
                            </label>
                            <div className="flex gap-2">
                                {/* Background */}
                                <button
                                    onClick={() => { setIsBackgroundOpen(!isBackgroundOpen); setIsOutlineOpen(false); setIsShadowOpen(false); }}
                                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg text-sm font-medium transition-colors ${
                                        isBackgroundOpen ? 'bg-pink-500/20 text-pink-400 border border-pink-500/30' : 
                                        backgroundEnabled ? 'bg-[#2a2a3a] text-white border border-white/10' : 'bg-[#1a1a24] text-gray-400 border border-white/10 hover:text-white'
                                    }`}
                                >
                                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                        <rect x="3" y="3" width="18" height="18" rx="3" />
                                    </svg>
                                    Background
                                </button>
                                {/* Outline */}
                                <button
                                    onClick={() => { setIsOutlineOpen(!isOutlineOpen); setIsBackgroundOpen(false); setIsShadowOpen(false); }}
                                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg text-sm font-medium transition-colors ${
                                        isOutlineOpen ? 'bg-pink-500/20 text-pink-400 border border-pink-500/30' : 
                                        outlineEnabled ? 'bg-[#2a2a3a] text-white border border-white/10' : 'bg-[#1a1a24] text-gray-400 border border-white/10 hover:text-white'
                                    }`}
                                >
                                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <rect x="3" y="3" width="18" height="18" rx="3" />
                                    </svg>
                                    Outline
                                </button>
                                {/* Shadow */}
                                <button
                                    onClick={() => { setIsShadowOpen(!isShadowOpen); setIsBackgroundOpen(false); setIsOutlineOpen(false); }}
                                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg text-sm font-medium transition-colors ${
                                        isShadowOpen ? 'bg-pink-500/20 text-pink-400 border border-pink-500/30' : 
                                        shadowEnabled ? 'bg-[#2a2a3a] text-white border border-white/10' : 'bg-[#1a1a24] text-gray-400 border border-white/10 hover:text-white'
                                    }`}
                                >
                                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" opacity="0.5">
                                        <circle cx="14" cy="14" r="8" />
                                    </svg>
                                    Shadow
                                </button>
                            </div>

                            {/* Background Panel */}
                            {isBackgroundOpen && (
                                <div className="mt-3 p-4 bg-[#1a1a24] rounded-lg border border-white/10 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-white text-sm font-medium">Background</span>
                                        <button
                                            onClick={() => updateBackground({ enabled: !backgroundEnabled })}
                                            className={`w-10 h-5 rounded-full transition-colors relative ${backgroundEnabled ? 'bg-pink-500' : 'bg-gray-600'}`}
                                        >
                                            <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${backgroundEnabled ? 'left-5' : 'left-0.5'}`} />
                                        </button>
                                    </div>
                                    {backgroundEnabled && (
                                        <>
                                            <div className="flex items-center gap-3">
                                                <span className="text-gray-400 text-xs w-14">Color</span>
                                                <input
                                                    type="color"
                                                    value={backgroundColor}
                                                    onChange={(e) => updateBackground({ color: e.target.value })}
                                                    className="w-8 h-8 rounded cursor-pointer border border-white/10"
                                                />
                                                <span className="text-gray-300 text-xs font-mono">{backgroundColor.toUpperCase()}</span>
                                            </div>
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-gray-400 text-xs">Opacity</span>
                                                    <span className="text-white text-xs">{localBackgroundOpacity}%</span>
                                                </div>
                                                <input
                                                    type="range"
                                                    min="0"
                                                    max="100"
                                                    value={localBackgroundOpacity}
                                                    onChange={(e) => setLocalBackgroundOpacity(Number(e.target.value))}
                                                    onMouseUp={() => updateBackground({ opacity: localBackgroundOpacity })}
                                                    className="w-full accent-pink-500 h-1.5"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-gray-400 text-xs">Radius</span>
                                                    <span className="text-white text-xs">{backgroundRadius}px</span>
                                                </div>
                                                <input
                                                    type="range"
                                                    min="0"
                                                    max="50"
                                                    value={backgroundRadius}
                                                    onChange={(e) => updateBackground({ borderRadius: Number(e.target.value) })}
                                                    className="w-full accent-pink-500 h-1.5"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-gray-400 text-xs">Padding</span>
                                                    <span className="text-white text-xs">{backgroundPadding}%</span>
                                                </div>
                                                <input
                                                    type="range"
                                                    min="0"
                                                    max="20"
                                                    value={backgroundPadding}
                                                    onChange={(e) => updateBackground({ padding: Number(e.target.value) })}
                                                    className="w-full accent-pink-500 h-1.5"
                                                />
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}

                            {/* Outline Panel */}
                            {isOutlineOpen && (
                                <div className="mt-3 p-4 bg-[#1a1a24] rounded-lg border border-white/10 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-white text-sm font-medium">Outline</span>
                                        <button
                                            onClick={() => updateOutline({ enabled: !outlineEnabled })}
                                            className={`w-10 h-5 rounded-full transition-colors relative ${outlineEnabled ? 'bg-pink-500' : 'bg-gray-600'}`}
                                        >
                                            <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${outlineEnabled ? 'left-5' : 'left-0.5'}`} />
                                        </button>
                                    </div>
                                    {outlineEnabled && (
                                        <>
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-gray-400 text-xs">Thickness</span>
                                                    <span className="text-white text-xs">{outlineThickness}px</span>
                                                </div>
                                                <input
                                                    type="range"
                                                    min="1"
                                                    max="20"
                                                    value={outlineThickness}
                                                    onChange={(e) => updateOutline({ width: Number(e.target.value) })}
                                                    className="w-full accent-pink-500 h-1.5"
                                                />
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-gray-400 text-xs w-14">Color</span>
                                                <input
                                                    type="color"
                                                    value={outlineColor}
                                                    onChange={(e) => updateOutline({ color: e.target.value })}
                                                    className="w-8 h-8 rounded cursor-pointer border border-white/10"
                                                />
                                                <span className="text-gray-300 text-xs font-mono">{outlineColor.toUpperCase()}</span>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}

                            {/* Shadow Panel */}
                            {isShadowOpen && (
                                <div className="mt-3 p-4 bg-[#1a1a24] rounded-lg border border-white/10 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-white text-sm font-medium">Shadow</span>
                                        <button
                                            onClick={() => updateShadow({ enabled: !shadowEnabled })}
                                            className={`w-10 h-5 rounded-full transition-colors relative ${shadowEnabled ? 'bg-pink-500' : 'bg-gray-600'}`}
                                        >
                                            <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${shadowEnabled ? 'left-5' : 'left-0.5'}`} />
                                        </button>
                                    </div>
                                    {shadowEnabled && (
                                        <>
                                            <div className="flex items-center gap-3">
                                                <span className="text-gray-400 text-xs w-14">Position</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-gray-500 text-xs">X:</span>
                                                    <input
                                                        type="number"
                                                        value={shadowX}
                                                        onChange={(e) => updateShadow({ position: { x: Number(e.target.value), y: shadowY } })}
                                                        className="w-12 bg-[#0d0d12] border border-white/10 rounded px-2 py-1 text-white text-xs text-center"
                                                    />
                                                    <span className="text-gray-500 text-xs">Y:</span>
                                                    <input
                                                        type="number"
                                                        value={shadowY}
                                                        onChange={(e) => updateShadow({ position: { x: shadowX, y: Number(e.target.value) } })}
                                                        className="w-12 bg-[#0d0d12] border border-white/10 rounded px-2 py-1 text-white text-xs text-center"
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-gray-400 text-xs">Blur</span>
                                                    <span className="text-white text-xs">{shadowBlur}px</span>
                                                </div>
                                                <input
                                                    type="range"
                                                    min="0"
                                                    max="50"
                                                    value={shadowBlur}
                                                    onChange={(e) => updateShadow({ blur: Number(e.target.value) })}
                                                    className="w-full accent-pink-500 h-1.5"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-gray-400 text-xs">Opacity</span>
                                                    <span className="text-white text-xs">{localShadowOpacity}%</span>
                                                </div>
                                                <input
                                                    type="range"
                                                    min="0"
                                                    max="100"
                                                    value={localShadowOpacity}
                                                    onChange={(e) => setLocalShadowOpacity(Number(e.target.value))}
                                                    onMouseUp={() => updateShadow({ opacity: localShadowOpacity })}
                                                    className="w-full accent-pink-500 h-1.5"
                                                />
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-gray-400 text-xs w-14">Color</span>
                                                <input
                                                    type="color"
                                                    value={shadowColor}
                                                    onChange={(e) => updateShadow({ color: e.target.value })}
                                                    className="w-8 h-8 rounded cursor-pointer border border-white/10"
                                                />
                                                <span className="text-gray-300 text-xs font-mono">{shadowColor.toUpperCase()}</span>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* DURATION */}
                        <div>
                            <label className="text-[10px] text-gray-400 uppercase tracking-wider font-medium mb-3 block">
                                Duration
                            </label>
                            
                            {/* Start & End Time */}
                            <div className="flex items-center gap-3 mb-3">
                                <div className="flex-1">
                                    <div className="flex items-center gap-1.5 text-gray-500 text-[10px] mb-1.5">
                                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <circle cx="12" cy="12" r="10" />
                                            <path d="M12 6v6l4 2" />
                                        </svg>
                                        Start
                                    </div>
                                    <div className="bg-[#1a1a24] border border-white/10 rounded-lg px-3 py-2 text-white text-sm font-mono">
                                        {formatTime(startTime)}
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-1.5 text-gray-500 text-[10px] mb-1.5 justify-end">
                                        End
                                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <circle cx="12" cy="12" r="10" />
                                            <path d="M12 6v6l4 2" />
                                        </svg>
                                    </div>
                                    <div className="bg-[#1a1a24] border border-white/10 rounded-lg px-3 py-2 text-white text-sm font-mono">
                                        {formatTime(endTime)}
                                    </div>
                                </div>
                            </div>
                            
                            {/* Textbox Duration */}
                            <div className="flex items-center justify-between bg-[#1a1a24] rounded-lg p-3 border border-white/10">
                                <span className="text-gray-300 text-sm">Textbox Duration</span>
                                <div className="flex items-center bg-[#0d0d12] border border-white/10 rounded-lg">
                                    <button
                                        onClick={() => {
                                            const newEnd = Math.max(startTime + 0.1, endTime - 0.1);
                                            onUpdate({ end: newEnd });
                                        }}
                                        className="px-2 py-1.5 text-gray-400 hover:text-white transition-colors"
                                    >
                                        <Minus size={14} />
                                    </button>
                                    <span className="px-3 text-white text-sm font-mono min-w-[60px] text-center">{textDuration.toFixed(2)}</span>
                                    <span className="text-gray-500 text-sm pr-1">s</span>
                                    <button
                                        onClick={() => {
                                            const newEnd = Math.min(clipEnd, endTime + 0.1);
                                            onUpdate({ end: newEnd });
                                        }}
                                        className="px-2 py-1.5 text-gray-400 hover:text-white transition-colors"
                                    >
                                        <Plus size={14} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'animation' && (
                    <div className="p-4 text-center">
                        <div className="text-gray-500 text-sm py-8">
                            Animation options coming soon
                        </div>
                    </div>
                )}
            </div>

            {/* Delete Button */}
            <div className="p-4 border-t border-white/5">
                <button
                    onClick={onDelete}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-transparent border border-red-500/30 text-red-400 rounded-lg hover:bg-red-500/10 transition-colors text-sm"
                >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete Text
                </button>
            </div>
        </div>
    );
};

export default TextEditPanel;

import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { X, ArrowLeft, Upload, Plus } from 'lucide-react';

interface BackgroundPanelProps {
    isOpen: boolean;
    onClose: () => void;
    currentColor: string;
    onColorChange: (color: string) => void;
}

type BackgroundTab = 'Color' | 'Image' | 'Video';

export const BackgroundPanel: React.FC<BackgroundPanelProps> = ({
    isOpen,
    onClose,
    currentColor,
    onColorChange
}) => {
    const [activeTab, setActiveTab] = useState<BackgroundTab>('Color');
    const [useForAllClips, setUseForAllClips] = useState(false);
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [hexInput, setHexInput] = useState(currentColor.replace('#', ''));
    const [hue, setHue] = useState(0);
    const [saturation, setSaturation] = useState(100);
    const [brightness, setBrightness] = useState(50);
    
    const gradientCanvasRef = useRef<HTMLCanvasElement>(null);
    const isDraggingRef = useRef(false);
    const isInitializedRef = useRef(false);

    // Convert HEX to RGB
    const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    };

    // Convert RGB to HSB
    const rgbToHsb = (r: number, g: number, b: number): { h: number; s: number; b: number } => {
        r /= 255;
        g /= 255;
        b /= 255;

        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const delta = max - min;

        let h = 0;
        const s = max === 0 ? 0 : (delta / max) * 100;
        const bValue = max * 100;

        if (delta !== 0) {
            if (max === r) {
                h = ((g - b) / delta + (g < b ? 6 : 0)) * 60;
            } else if (max === g) {
                h = ((b - r) / delta + 2) * 60;
            } else {
                h = ((r - g) / delta + 4) * 60;
            }
        }

        return { h: Math.round(h), s: Math.round(s), b: Math.round(bValue) };
    };

    // Initialize color picker with current color when opened - use layoutEffect to ensure it runs before canvas drawing
    useLayoutEffect(() => {
        if (showColorPicker && !isInitializedRef.current) {
            const rgb = hexToRgb(currentColor);
            if (rgb) {
                const hsb = rgbToHsb(rgb.r, rgb.g, rgb.b);
                setHue(hsb.h);
                setSaturation(hsb.s);
                setBrightness(hsb.b);
                isInitializedRef.current = true;
            }
            setHexInput(currentColor.replace('#', ''));
        } else if (!showColorPicker) {
            isInitializedRef.current = false;
        }
    }, [showColorPicker]);

    // Initialize hex input when currentColor changes
    useEffect(() => {
        setHexInput(currentColor.replace('#', ''));
    }, [currentColor]);

    // Convert HSB to RGB
    const hsbToRgb = (h: number, s: number, b: number): { r: number; g: number; b: number } => {
        s /= 100;
        b /= 100;
        const k = (n: number) => (n + h / 60) % 6;
        const f = (n: number) => b * (1 - s * Math.max(0, Math.min(k(n), 4 - k(n), 1)));
        return {
            r: Math.round(255 * f(5)),
            g: Math.round(255 * f(3)),
            b: Math.round(255 * f(1))
        };
    };

    // Convert RGB to HEX
    const rgbToHex = (r: number, g: number, b: number): string => {
        return '#' + [r, g, b].map(x => {
            const hex = x.toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        }).join('');
    };

    // Handle gradient canvas click/drag
    const handleGradientInteraction = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = gradientCanvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const newSaturation = Math.max(0, Math.min(100, (x / rect.width) * 100));
        const newBrightness = Math.max(0, Math.min(100, 100 - (y / rect.height) * 100));

        setSaturation(newSaturation);
        setBrightness(newBrightness);

        const rgb = hsbToRgb(hue, newSaturation, newBrightness);
        const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
        onColorChange(hex);
        setHexInput(hex.replace('#', ''));
    };

    const handleGradientMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
        isDraggingRef.current = true;
        handleGradientInteraction(e);
    };

    const handleGradientMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (isDraggingRef.current) {
            handleGradientInteraction(e);
        }
    };

    const handleGradientMouseUp = () => {
        isDraggingRef.current = false;
    };

    // Handle hue slider change
    const handleHueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newHue = parseInt(e.target.value);
        setHue(newHue);

        const rgb = hsbToRgb(newHue, saturation, brightness);
        const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
        onColorChange(hex);
        setHexInput(hex.replace('#', ''));
    };

    // Handle hex input change
    const handleHexInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let value = e.target.value.replace(/[^0-9a-fA-F]/g, '').toUpperCase();
        if (value.length > 6) value = value.slice(0, 6);
        setHexInput(value);

        if (value.length === 6) {
            const hex = '#' + value;
            onColorChange(hex);
        }
    };

    // Draw gradient canvas - depends on hue and showColorPicker to redraw when opened
    useEffect(() => {
        if (!showColorPicker) return;

        const canvas = gradientCanvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const width = canvas.width;
        const height = canvas.height;

        // Draw saturation gradient (left to right)
        const saturationGradient = ctx.createLinearGradient(0, 0, width, 0);
        const rgb = hsbToRgb(hue, 100, 100);
        saturationGradient.addColorStop(0, '#FFFFFF');
        saturationGradient.addColorStop(1, `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`);

        ctx.fillStyle = saturationGradient;
        ctx.fillRect(0, 0, width, height);

        // Draw brightness gradient (top to bottom)
        const brightnessGradient = ctx.createLinearGradient(0, 0, 0, height);
        brightnessGradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
        brightnessGradient.addColorStop(1, 'rgba(0, 0, 0, 1)');

        ctx.fillStyle = brightnessGradient;
        ctx.fillRect(0, 0, width, height);
    }, [hue, showColorPicker]);

    const colorPresets = [
        // Row 1 - Pinks/Magentas
        '#D43F8C', '#EC4899', '#DB2777',
        // Row 2 - More Pinks
        '#F472B6', '#F9A8D4', '#FBE2EE',
        // Row 3 - Whites/Light
        '#FFFFFF', '#FEF3F8', '#E5E7EB',
        // Row 4 - Darks/Purples
        '#1F1B2E', '#2D1B4E', '#4C1D95',
        // Row 5 - Gradients (will use solid colors for now)
        '#DDA8E8', '#C084FC', '#E9D5FF',
    ];

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div 
                className="fixed inset-0 bg-black/50 z-40"
                onClick={onClose}
            />

            {/* Side Panel */}
            <div className="fixed left-0 top-0 bottom-0 w-[420px] bg-[#1a1a2e] border-r border-[#2a2a3e] z-50 flex flex-col animate-slide-in">
                {/* Header */}
                <div className="h-16 flex items-center justify-between px-6 border-b border-[#2a2a3e]">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onClose}
                            className="p-2 text-gray-400 hover:text-white hover:bg-[#2a2a3e] rounded-lg transition-all duration-200"
                        >
                            <ArrowLeft size={18} />
                        </button>
                        <h2 className="text-white text-lg font-semibold">Background</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-white hover:bg-[#2a2a3e] rounded-lg transition-all duration-200"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto">
                    {/* Settings Section */}
                    <div className="p-6 border-b border-[#2a2a3e]">
                        <h3 className="text-gray-400 text-xs font-semibold tracking-wider uppercase mb-4">
                            SETTINGS
                        </h3>
                        <div className="flex items-center justify-between p-3 bg-[#0d0d15] rounded-lg">
                            <span className="text-white text-sm">Use same background for all clips</span>
                            <button
                                onClick={() => setUseForAllClips(!useForAllClips)}
                                className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${
                                    useForAllClips ? 'bg-[#ec4899]' : 'bg-[#3b3b50]'
                                }`}
                            >
                                <div
                                    className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 ${
                                        useForAllClips ? 'translate-x-6' : 'translate-x-0'
                                    }`}
                                />
                            </button>
                        </div>
                    </div>

                    {/* Backgrounds Section */}
                    <div className="p-6">
                        <h3 className="text-gray-400 text-xs font-semibold tracking-wider uppercase mb-4">
                            BACKGROUNDS
                        </h3>

                        {/* Upload Button */}
                        <button className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#4f46e5] hover:bg-[#4338ca] text-white rounded-lg font-medium transition-all duration-200 mb-4">
                            <Plus size={18} />
                            <span>Upload media</span>
                        </button>

                        {/* Tabs */}
                        <div className="flex items-center gap-1 mb-6 p-1 bg-[#0d0d15] rounded-lg">
                            {(['Color', 'Image', 'Video'] as BackgroundTab[]).map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                                        activeTab === tab
                                            ? 'bg-[#2a2a3e] text-white'
                                            : 'text-gray-400 hover:text-white'
                                    }`}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>

                        {/* Color Tab Content */}
                        {activeTab === 'Color' && (
                            <div className="space-y-4">
                                {/* Primary Color Display */}
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-400 text-sm">Primary Color</span>
                                    <div className="flex items-center gap-2">
                                        <div
                                            className="w-8 h-8 rounded-full border-2 border-white/20 cursor-pointer hover:scale-110 transition-transform"
                                            style={{ backgroundColor: currentColor }}
                                            onClick={() => setShowColorPicker(true)}
                                        />
                                        <span 
                                            className="text-white text-sm font-mono cursor-pointer hover:text-[#ec4899] transition-colors"
                                            onClick={() => setShowColorPicker(true)}
                                        >
                                            {currentColor.toUpperCase()}
                                        </span>
                                    </div>
                                </div>

                                {/* Color Presets Grid - No Label */}
                                <div className="grid grid-cols-3 gap-3">
                                    {colorPresets.map((color) => (
                                        <button
                                            key={color}
                                            onClick={() => {
                                                onColorChange(color);
                                                setHexInput(color.replace('#', ''));
                                            }}
                                            className={`aspect-video rounded-lg transition-all duration-200 hover:scale-105 ${
                                                currentColor.toUpperCase() === color.toUpperCase()
                                                    ? 'ring-2 ring-[#ec4899] ring-offset-2 ring-offset-[#1a1a2e]'
                                                    : ''
                                            }`}
                                            style={{ backgroundColor: color }}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Image Tab Content */}
                        {activeTab === 'Image' && (
                            <div className="text-center py-12">
                                <Upload size={48} className="mx-auto text-gray-600 mb-4" />
                                <p className="text-gray-400 text-sm">Upload background images</p>
                                <p className="text-gray-500 text-xs mt-2">Coming soon...</p>
                            </div>
                        )}

                        {/* Video Tab Content */}
                        {activeTab === 'Video' && (
                            <div className="text-center py-12">
                                <Upload size={48} className="mx-auto text-gray-600 mb-4" />
                                <p className="text-gray-400 text-sm">Upload background videos</p>
                                <p className="text-gray-500 text-xs mt-2">Coming soon...</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Color Picker Popup Modal */}
            {showColorPicker && (
                <>
                    {/* Modal Backdrop */}
                    <div 
                        className="fixed inset-0 bg-black/60 z-[60] backdrop-blur-sm"
                        onClick={() => setShowColorPicker(false)}
                    />

                    {/* Color Picker Modal */}
                    <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[560px] bg-[#1a1a2e] rounded-2xl shadow-2xl z-[70] animate-fade-in border border-[#2a2a3e]">
                        {/* Modal Content */}
                        <div className="p-6 space-y-6">
                            {/* Gradient Canvas */}
                            <div className="relative">
                                <canvas
                                    ref={gradientCanvasRef}
                                    width={512}
                                    height={300}
                                    className="w-full h-[300px] rounded-xl cursor-crosshair"
                                    onMouseDown={handleGradientMouseDown}
                                    onMouseMove={handleGradientMouseMove}
                                    onMouseUp={handleGradientMouseUp}
                                    onMouseLeave={handleGradientMouseUp}
                                />
                                {/* Picker Circle */}
                                <div
                                    className="absolute w-6 h-6 border-3 border-white rounded-full pointer-events-none"
                                    style={{
                                        left: `calc(${saturation}% - 12px)`,
                                        top: `calc(${100 - brightness}% - 12px)`,
                                        boxShadow: '0 0 0 2px rgba(0,0,0,0.5), 0 4px 12px rgba(0,0,0,0.6)'
                                    }}
                                />
                            </div>

                            {/* Controls Row */}
                            <div className="flex items-center gap-4">
                                {/* Hex Input */}
                                <div className="flex items-center gap-2 bg-[#0d0d15] rounded-lg px-4 py-3 flex-1">
                                    <select className="bg-transparent text-gray-400 text-sm outline-none cursor-pointer">
                                        <option>HEX</option>
                                    </select>
                                    <span className="text-white text-base">#</span>
                                    <input
                                        type="text"
                                        value={hexInput}
                                        onChange={handleHexInputChange}
                                        className="bg-transparent text-white text-base outline-none flex-1 font-mono uppercase tracking-wider"
                                        placeholder="3F87D4"
                                        maxLength={6}
                                    />
                                </div>

                                {/* Current Color Preview */}
                                <div
                                    className="w-14 h-14 rounded-xl border-2 border-white/20"
                                    style={{ backgroundColor: currentColor }}
                                />
                            </div>

                            {/* Hue Slider */}
                            <div className="space-y-2">
                                <input
                                    type="range"
                                    min="0"
                                    max="360"
                                    value={hue}
                                    onChange={handleHueChange}
                                    className="w-full h-3 rounded-full appearance-none cursor-pointer"
                                    style={{
                                        background: 'linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)',
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                </>
            )}
        </>
    );
};

export default BackgroundPanel;

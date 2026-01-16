import React from 'react';
import { Share2, Download, Loader2, Save, Check } from 'lucide-react';

interface HeaderSectionProps {
    projectTitle?: string;
    activeTab: 'video' | 'article';
    onTabChange: (tab: 'video' | 'article') => void;
    onShare?: () => void;
    onExport?: () => void;
    onSave?: () => void;
    isExporting?: boolean;
    canExport?: boolean;
    isSaving?: boolean;
    hasUnsavedChanges?: boolean;
    lastSavedAt?: Date | null;
}

export const HeaderSection: React.FC<HeaderSectionProps> = ({
    projectTitle = 'Video Project',
    activeTab,
    onTabChange,
    onShare,
    onExport,
    onSave,
    isExporting = false,
    canExport = true,
    isSaving = false,
    hasUnsavedChanges = false,
    lastSavedAt = null
}) => {
    // Format "Saved 2m ago"
    const formatTimeAgo = (date: Date | null): string => {
        if (!date) return '';
        const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
        if (seconds < 5) return 'Saved just now';
        if (seconds < 60) return `Saved ${seconds}s ago`;
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `Saved ${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        return `Saved ${hours}h ago`;
    };

    return (
        <header className="h-10 bg-[#252538] border-b border-[#2a2a3e] flex items-center justify-between px-4 flex-shrink-0">
                {/* Left Section - Logo, File Menu & Title */}
                <div className="flex items-center gap-3">
                    {/* Logo */}
                    <div className="flex items-center gap-1.5">
                        <div className="w-6 h-6 rounded-md bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                            <span className="text-white font-bold text-xs">E</span>
                        </div>
                        <span className="text-white font-semibold text-xs hidden sm:block">Explaino</span>
                    </div>

                    {/* File Menu */}
                    <button className="text-gray-300 hover:text-white text-xs font-medium transition-colors px-1.5 py-0.5 rounded hover:bg-[#3b3b50]">
                        File
                    </button>

                    {/* Divider */}
                    <div className="w-px h-4 bg-[#3b3b50]" />

                    {/* Project Title */}
                    <h1 className="text-white font-normal text-xs truncate max-w-[150px] md:max-w-[250px]">
                        {projectTitle}
                    </h1>
                </div>

                {/* Center Section - Tabs */}
                <div className="flex items-center gap-0.5 bg-[#1e1e2e] rounded-md p-0.5">
                    <button
                        onClick={() => onTabChange('video')}
                        className={`px-3 py-1 rounded text-xs font-medium transition-all duration-200 ${activeTab === 'video'
                            ? 'bg-[#3b3b50] text-white'
                            : 'text-gray-400 hover:text-white'
                            }`}
                    >
                        Video
                    </button>
                    <button
                        onClick={() => onTabChange('article')}
                        className={`px-3 py-1 rounded text-xs font-medium transition-all duration-200 ${activeTab === 'article'
                            ? 'bg-[#3b3b50] text-white'
                            : 'text-gray-400 hover:text-white'
                            }`}
                    >
                        Article
                    </button>
                </div>

                {/* Right Section - Actions */}
                <div className="flex items-center gap-1.5">
                    {/* Save Button */}
                    {onSave && (
                        <div className="flex items-center gap-1.5">
                            <button
                                onClick={onSave}
                                disabled={isSaving || !hasUnsavedChanges}
                                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium text-xs transition-all duration-200 ${
                                    isSaving
                                        ? 'bg-[#4a4a5e] text-gray-400 cursor-not-allowed'
                                        : !hasUnsavedChanges
                                        ? 'bg-[#3b3b50] text-gray-500 cursor-not-allowed'
                                        : 'bg-green-500 hover:bg-green-600 text-white'
                                }`}
                                title={
                                    isSaving 
                                        ? 'Saving...' 
                                        : !hasUnsavedChanges 
                                        ? 'No changes to save' 
                                        : 'Save changes (Cmd+S)'
                                }
                            >
                                {isSaving ? (
                                    <>
                                        <Loader2 size={12} className="animate-spin" />
                                        <span>Saving...</span>
                                    </>
                                ) : !hasUnsavedChanges ? (
                                    <>
                                        <Check size={12} />
                                        <span>Saved</span>
                                    </>
                                ) : (
                                    <>
                                        <Save size={12} />
                                        <span>Save</span>
                                    </>
                                )}
                            </button>
                            
                            {/* Last saved timestamp */}
                            {lastSavedAt && !hasUnsavedChanges && (
                                <span className="text-[10px] text-gray-500">
                                    {formatTimeAgo(lastSavedAt)}
                                </span>
                            )}
                        </div>
                    )}
                    
                    {/* Export Button */}
                    <button
                        onClick={onExport}
                        disabled={isExporting || !canExport}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium text-xs transition-all duration-200 ${isExporting
                            ? 'bg-[#4a4a5e] text-gray-400 cursor-not-allowed'
                            : !canExport
                                ? 'bg-[#3b3b50] text-gray-500 cursor-not-allowed'
                                : 'bg-indigo-500 hover:bg-indigo-600 text-white'
                            }`}
                        title={!canExport ? 'Process video first' : 'Export video with effects'}
                    >
                        {isExporting ? (
                            <>
                                <Loader2 size={12} className="animate-spin" />
                                <span>Exporting...</span>
                            </>
                        ) : (
                            <>
                                <Download size={12} />
                                <span>Export</span>
                            </>
                        )}
                    </button>

                    {/* Share Button */}
                    <button
                        onClick={onShare}
                        className="flex items-center gap-1.5 px-2.5 py-1 bg-pink-500 hover:bg-pink-600 text-white rounded-md font-medium text-xs transition-all duration-200"
                    >
                        <Share2 size={12} />
                        <span>Share</span>
                    </button>
                </div>
            </header>
    );
};

export default HeaderSection;

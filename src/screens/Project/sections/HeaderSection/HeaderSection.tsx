import React from 'react';
import { Share2, Download, Loader2 } from 'lucide-react';

interface HeaderSectionProps {
    projectTitle?: string;
    activeTab: 'video' | 'article';
    onTabChange: (tab: 'video' | 'article') => void;
    onShare?: () => void;
    onExport?: () => void;
    isExporting?: boolean;
    canExport?: boolean;
}

export const HeaderSection: React.FC<HeaderSectionProps> = ({
    projectTitle = 'Video Project',
    activeTab,
    onTabChange,
    onShare,
    onExport,
    isExporting = false,
    canExport = true
}) => {
    return (
        <header className="h-14 bg-[#252538] border-b border-[#2a2a3e] flex items-center justify-between px-6 flex-shrink-0">
                {/* Left Section - Logo, File Menu & Title */}
                <div className="flex items-center gap-4">
                    {/* Logo */}
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                            <span className="text-white font-bold text-sm">E</span>
                        </div>
                        <span className="text-white font-semibold text-base hidden sm:block">Explaino</span>
                    </div>

                    {/* File Menu */}
                    <button className="text-gray-300 hover:text-white text-sm font-medium transition-colors px-2 py-1 rounded hover:bg-[#3b3b50]">
                        File
                    </button>

                    {/* Divider */}
                    <div className="w-px h-6 bg-[#3b3b50]" />

                    {/* Project Title */}
                    <h1 className="text-white font-normal text-sm truncate max-w-[200px] md:max-w-[300px]">
                        {projectTitle}
                    </h1>
                </div>

                {/* Center Section - Tabs */}
                <div className="flex items-center gap-1 bg-[#1e1e2e] rounded-lg p-1">
                    <button
                        onClick={() => onTabChange('video')}
                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${activeTab === 'video'
                            ? 'bg-[#3b3b50] text-white'
                            : 'text-gray-400 hover:text-white'
                            }`}
                    >
                        Video
                    </button>
                    <button
                        onClick={() => onTabChange('article')}
                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${activeTab === 'article'
                            ? 'bg-[#3b3b50] text-white'
                            : 'text-gray-400 hover:text-white'
                            }`}
                    >
                        Article
                    </button>
                </div>

                {/* Right Section - Actions */}
                <div className="flex items-center gap-2">
                    {/* Export Button */}
                    <button
                        onClick={onExport}
                        disabled={isExporting || !canExport}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${isExporting
                            ? 'bg-[#4a4a5e] text-gray-400 cursor-not-allowed'
                            : !canExport
                                ? 'bg-[#3b3b50] text-gray-500 cursor-not-allowed'
                                : 'bg-indigo-500 hover:bg-indigo-600 text-white'
                            }`}
                        title={!canExport ? 'Process video first' : 'Export video with effects'}
                    >
                        {isExporting ? (
                            <>
                                <Loader2 size={16} className="animate-spin" />
                                <span>Exporting...</span>
                            </>
                        ) : (
                            <>
                                <Download size={16} />
                                <span>Export</span>
                            </>
                        )}
                    </button>

                    {/* Share Button */}
                    <button
                        onClick={onShare}
                        className="flex items-center gap-2 px-4 py-2 bg-pink-500 hover:bg-pink-600 text-white rounded-lg font-medium text-sm transition-all duration-200"
                    >
                        <Share2 size={16} />
                        <span>Share</span>
                    </button>
                </div>
            </header>
    );
};

export default HeaderSection;

import React, { useState, useEffect } from 'react';
import { Upload, Play, Pause, Star } from 'lucide-react';

interface MusicFile {
    key: string;
    filename: string;
    size: number;
    lastModified: string;
    url?: string;
}

interface MusicSectionProps {
    isVisible: boolean;
    onClose: () => void;
    onMusicSelect?: (url: string, filename: string) => void;
}

const CATEGORY_FILTERS = ['All', 'Uploads', 'Corporate', 'Acoustic', 'Rock, Pop', 'Jazz'];

export const MusicSection: React.FC<MusicSectionProps> = ({
    isVisible,
    onClose,
    onMusicSelect
}) => {
    const [musicFiles, setMusicFiles] = useState<MusicFile[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedFilter, setSelectedFilter] = useState<string>('All');
    const [playingTrack, setPlayingTrack] = useState<string | null>(null);
    const [favorites, setFavorites] = useState<Set<string>>(new Set());
    const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

    const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

    useEffect(() => {
        if (isVisible) {
            fetchMusicFiles();
        }
    }, [isVisible]);

    useEffect(() => {
        // Cleanup audio on unmount
        return () => {
            if (audioElement) {
                audioElement.pause();
                audioElement.src = '';
            }
        };
    }, [audioElement]);

    const fetchMusicFiles = async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`${API_BASE}/api/music/list`);
            if (!response.ok) {
                throw new Error('Failed to fetch music files');
            }

            const data = await response.json();
            setMusicFiles(data.music || []);
        } catch (err: any) {
            console.error('[Music] Fetch error:', err);
            setError(err.message || 'Failed to load music');
        } finally {
            setLoading(false);
        }
    };

    const handleUploadClick = () => {
        // TODO: Implement file upload UI
        alert('Upload functionality will be implemented. For now, use the CLI tool or API directly.');
    };

    const getMusicCategory = (filename: string): string => {
        const name = filename.toLowerCase();
        if (name.includes('corporate') || name.includes('luxury')) return 'Corporate';
        if (name.includes('acoustic') || name.includes('minimal')) return 'Acoustic';
        if (name.includes('rock') || name.includes('pop') || name.includes('upbeat')) return 'Rock, Pop';
        if (name.includes('jazz')) return 'Jazz';
        return 'Uploads';
    };

    const filteredMusic = musicFiles.filter(file => {
        if (selectedFilter === 'All') return true;
        return getMusicCategory(file.filename) === selectedFilter;
    });

    const toggleFavorite = (filename: string) => {
        setFavorites(prev => {
            const newFavorites = new Set(prev);
            if (newFavorites.has(filename)) {
                newFavorites.delete(filename);
            } else {
                newFavorites.add(filename);
            }
            return newFavorites;
        });
    };

    const handlePlayPause = async (file: MusicFile) => {
        if (playingTrack === file.filename) {
            // Pause current track
            if (audioElement) {
                audioElement.pause();
            }
            setPlayingTrack(null);
            return;
        }

        try {
            // Get presigned URL if not cached
            let url = file.url;
            if (!url) {
                const response = await fetch(`${API_BASE}/api/music/${encodeURIComponent(file.filename)}`);
                if (!response.ok) throw new Error('Failed to get music URL');
                const data = await response.json();
                url = data.url;

                // Cache the URL
                setMusicFiles(prev => prev.map(f =>
                    f.filename === file.filename ? { ...f, url } : f
                ));
            }

            // Play new track
            if (audioElement) {
                audioElement.pause();
            }

            const audio = new Audio(url);
            audio.volume = 0.5;
            audio.addEventListener('ended', () => setPlayingTrack(null));
            audio.play();

            setAudioElement(audio);
            setPlayingTrack(file.filename);
        } catch (err: any) {
            console.error('[Music] Play error:', err);
            setError(err.message || 'Failed to play music');
        }
    };

    const handleMusicSelect = async (file: MusicFile) => {
        if (!onMusicSelect) return;

        try {
            // Get presigned URL
            let url = file.url;
            if (!url) {
                const response = await fetch(`${API_BASE}/api/music/${encodeURIComponent(file.filename)}`);
                if (!response.ok) throw new Error('Failed to get music URL');
                const data = await response.json();
                url = data.url;
            }

            if (url) {
                onMusicSelect(url, file.filename);
            }
        } catch (err: any) {
            console.error('[Music] Select error:', err);
            setError(err.message || 'Failed to select music');
        }
    };

    if (!isVisible) return null;

    return (
        <aside className="w-[360px] bg-gradient-to-b from-[#1e1e2e] to-[#1a1a28] border-r border-white/5 flex flex-col h-screen">
            {/* Header */}
            <div className="px-4 py-3 border-b border-white/5">
                <div className="flex items-center justify-between mb-4">
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                        title="Collapse panel"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 19l-7-7 7-7M18 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <h2 className="text-sm font-semibold text-white">Music & Sound Effects</h2>
                    <div className="w-8" />
                </div>

                {/* Upload Button */}
                <button
                    onClick={handleUploadClick}
                    className="w-full h-10 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white rounded-lg flex items-center justify-center gap-2 transition-all font-medium text-sm shadow-lg shadow-indigo-500/25"
                >
                    <Upload size={16} />
                    Upload Music
                </button>
            </div>

            {/* Category Filters */}
            <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2 overflow-x-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                <button
                    className={`p-2 rounded-lg transition-all ${favorites.size > 0 ? 'text-yellow-400 bg-yellow-400/10' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
                    onClick={() => setFavorites(new Set())}
                    title="Favorites"
                >
                    <Star size={14} className={favorites.size > 0 ? 'fill-yellow-400' : ''} />
                </button>
                {CATEGORY_FILTERS.map(filter => (
                    <button
                        key={filter}
                        onClick={() => setSelectedFilter(filter)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${selectedFilter === filter
                                ? 'bg-white text-black shadow-md'
                                : 'bg-white/5 text-gray-300 hover:text-white hover:bg-white/10 border border-white/5'
                            }`}
                    >
                        {filter}
                    </button>
                ))}
            </div>

            {/* Music List */}
            <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                {loading ? (
                    <div className="flex items-center justify-center h-32">
                        <div className="flex items-center gap-2 text-gray-400">
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span className="text-sm">Loading music...</span>
                        </div>
                    </div>
                ) : error ? (
                    <div className="p-4">
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm">
                            {error}
                        </div>
                        <button
                            onClick={fetchMusicFiles}
                            className="mt-3 text-indigo-400 hover:text-indigo-300 text-sm font-medium"
                        >
                            Try again
                        </button>
                    </div>
                ) : filteredMusic.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 text-gray-400">
                        <p className="text-sm">No music files found</p>
                        <button
                            onClick={handleUploadClick}
                            className="mt-2 text-indigo-400 hover:text-indigo-300 text-sm font-medium"
                        >
                            Upload music
                        </button>
                    </div>
                ) : (
                    <div className="p-3 space-y-2">
                        {filteredMusic.map((file) => {
                            const category = getMusicCategory(file.filename);
                            const isPlaying = playingTrack === file.filename;
                            const isFavorite = favorites.has(file.filename);

                            return (
                                <div
                                    key={file.key}
                                    className="group bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 hover:border-white/10 rounded-xl p-3 transition-all cursor-pointer"
                                    onClick={() => handleMusicSelect(file)}
                                >
                                    <div className="flex items-center gap-3">
                                        {/* Play Button */}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handlePlayPause(file);
                                            }}
                                            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-lg ${isPlaying
                                                    ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white scale-105'
                                                    : 'bg-gradient-to-br from-purple-500 to-orange-500 text-white hover:scale-105'
                                                }`}
                                        >
                                            {isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" className="ml-0.5" />}
                                        </button>

                                        {/* Track Info */}
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-white font-medium text-sm truncate">
                                                {file.filename.replace(/\.[^/.]+$/, '')}
                                            </h4>
                                            <p className="text-gray-500 text-xs mt-0.5">{category}</p>
                                        </div>

                                        {/* Favorite Button */}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleFavorite(file.filename);
                                            }}
                                            className={`p-2 rounded-lg transition-all ${isFavorite ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                                        >
                                            <Star
                                                size={14}
                                                className={isFavorite ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400 hover:text-yellow-400'}
                                            />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </aside>
    );
};

export default MusicSection;

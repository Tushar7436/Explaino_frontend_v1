import React from 'react';
import { Mic, Shapes, LayoutTemplate, Music, Captions, HelpCircle } from 'lucide-react';

export type SidebarMenuItem = 'script' | 'elements' | 'templates' | 'music' | 'captions';

interface SideNavigationSectionProps {
    activeItem: SidebarMenuItem | null;
    onItemClick: (item: SidebarMenuItem) => void;
}

interface MenuItemProps {
    icon: React.ReactNode;
    label: string;
    isActive: boolean;
    onClick: () => void;
    badge?: string;
}

const MenuItem: React.FC<MenuItemProps> = ({ icon, label, isActive, onClick, badge }) => (
    <button
        onClick={onClick}
        className={`w-full flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl transition-all duration-200 group relative ${
            isActive
                ? 'bg-gradient-to-b from-indigo-500/20 to-indigo-600/10 text-white shadow-lg shadow-indigo-500/10'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
        }`}
    >
        {/* Active indicator bar */}
        {isActive && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-8 bg-indigo-500 rounded-r-full" />
        )}
        
        <div className={`relative transition-all duration-200 ${isActive ? 'scale-110 text-indigo-400' : 'group-hover:scale-105'}`}>
            {icon}
            {badge && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
            )}
        </div>
        <span className={`text-[10px] font-medium tracking-wide ${isActive ? 'text-white' : ''}`}>{label}</span>
    </button>
);

export const SideNavigationSection: React.FC<SideNavigationSectionProps> = ({
    activeItem,
    onItemClick
}) => {
    const menuItems: Array<{ id: SidebarMenuItem; icon: React.ReactNode; label: string; badge?: string }> = [
        { id: 'script', icon: <Mic size={18} strokeWidth={1.5} />, label: 'Script' },
        { id: 'elements', icon: <Shapes size={18} strokeWidth={1.5} />, label: 'Elements' },
        { id: 'templates', icon: <LayoutTemplate size={18} strokeWidth={1.5} />, label: 'Templates' },
        { id: 'music', icon: <Music size={18} strokeWidth={1.5} />, label: 'Music' },
        { id: 'captions', icon: <Captions size={18} strokeWidth={1.5} />, label: 'Captions' },
    ];

    return (
        <aside className="w-20 bg-gradient-to-b from-[#1a1a28] to-[#15151f] border-r border-white/5 flex flex-col">
            {/* Main Menu Items */}
            <nav className="flex-1 p-2 space-y-0.5 mt-2">
                {menuItems.map((item) => (
                    <MenuItem
                        key={item.id}
                        icon={item.icon}
                        label={item.label}
                        isActive={activeItem === item.id}
                        onClick={() => onItemClick(item.id)}
                        badge={item.badge}
                    />
                ))}
            </nav>

            {/* Support Link - Bottom */}
            <div className="p-2 border-t border-white/5">
                <button
                    className="w-full flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl text-gray-500 hover:text-white hover:bg-white/5 transition-all duration-200"
                >
                    <HelpCircle size={18} strokeWidth={1.5} />
                    <span className="text-[10px] font-medium tracking-wide">Support</span>
                </button>
            </div>
        </aside>
    );
};

export default SideNavigationSection;

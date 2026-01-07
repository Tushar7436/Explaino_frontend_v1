import React from 'react';
import { FileText, Shapes, LayoutTemplate, Music, Captions, HelpCircle } from 'lucide-react';

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
}

const MenuItem: React.FC<MenuItemProps> = ({ icon, label, isActive, onClick }) => (
    <button
        onClick={onClick}
        className={`w-full flex flex-col items-center gap-1.5 py-3 px-2 rounded-lg transition-all duration-200 group ${isActive
                ? 'bg-[#3b3b50] text-white'
                : 'text-gray-400 hover:text-white hover:bg-[#2a2a3e]'
            }`}
    >
        <div className={`transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-105'}`}>
            {icon}
        </div>
        <span className="text-xs font-medium">{label}</span>
    </button>
);

export const SideNavigationSection: React.FC<SideNavigationSectionProps> = ({
    activeItem,
    onItemClick
}) => {
    const menuItems: Array<{ id: SidebarMenuItem; icon: React.ReactNode; label: string }> = [
        { id: 'script', icon: <FileText size={20} />, label: 'Script' },
        { id: 'elements', icon: <Shapes size={20} />, label: 'Elements' },
        { id: 'templates', icon: <LayoutTemplate size={20} />, label: 'Templates' },
        { id: 'music', icon: <Music size={20} />, label: 'Music' },
        { id: 'captions', icon: <Captions size={20} />, label: 'Captions' },
    ];

    return (
        <aside className="w-20 bg-[#1e1e2e] border-r border-[#2a2a3e] flex flex-col">
            {/* Main Menu Items */}
            <nav className="flex-1 p-2 space-y-1">
                {menuItems.map((item) => (
                    <MenuItem
                        key={item.id}
                        icon={item.icon}
                        label={item.label}
                        isActive={activeItem === item.id}
                        onClick={() => onItemClick(item.id)}
                    />
                ))}
            </nav>

            {/* Support Link - Bottom */}
            <div className="p-2 border-t border-[#2a2a3e]">
                <button
                    className="w-full flex flex-col items-center gap-1.5 py-3 px-2 rounded-lg text-gray-400 hover:text-white hover:bg-[#2a2a3e] transition-all duration-200"
                >
                    <HelpCircle size={20} />
                    <span className="text-xs font-medium">Support</span>
                </button>
            </div>
        </aside>
    );
};

export default SideNavigationSection;

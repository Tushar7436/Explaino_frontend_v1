import {
  ChevronLeftIcon,
  ChevronRightIcon,
  HomeIcon,
  SettingsIcon,
  VideoIcon,
  PlusIcon,
  SearchIcon,
  FolderIcon,
  SparklesIcon,
  UsersIcon,
  BarChart3Icon,
  LogOutIcon,
  Sun,
  Moon,
} from "lucide-react";

import { Badge } from "../../../../components/ui/badge";
import { Button } from "../../../../components/ui/button";

const navigationItems = [
  { icon: HomeIcon, label: "Home", active: false },
  { icon: FolderIcon, label: "All Projects", active: false },
  { icon: VideoIcon, label: "Video Templates", active: false },
  { icon: SparklesIcon, label: "Auto-update", active: false, badge: "NEW" },
  { icon: UsersIcon, label: "Team", active: false },
  { icon: BarChart3Icon, label: "Analytics", active: false },
];

type SideNavProps = {
  active?: string;
  onSelect?: (label: string) => void;
  variant?: "light" | "dark";
  onToggleVariant?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
};

export const SideNavigationSection = ({
  active,
  onSelect,
  variant = "light",
  onToggleVariant,
  isCollapsed = false,
  onToggleCollapse
}: SideNavProps): JSX.Element => {
  const isDark = variant === "dark";

  return (
    <aside className={`fixed left-0 top-0 flex flex-col h-screen items-start overflow-hidden transition-all duration-300 ${isCollapsed ? 'w-[80px]' : 'w-[268px]'} ${isDark ? "bg-[#1a1a2e]" : "bg-white shadow-lg"}`}>
      <header className={`gap-3 p-4 flex-[0_0_auto] ${isDark ? "bg-transparent" : "bg-white"} flex items-center relative self-stretch w-full`}>
        {!isCollapsed ? (
          <img
            className="h-8 w-auto object-contain"
            alt="Explaino Logo"
            src="https://cdn.vocallabs.ai/landing_page/c0301741-add9-438b-a073-b163020fc7e2.png"
          />
        ) : (
          <img
            className="h-8 w-8 object-contain"
            alt="Explaino Icon"
            src="https://cdn.vocallabs.ai/landing_page/a2b0cd13-51fb-49ae-80fb-a9a245053d25.png"
          />
        )}

        <div className={`flex items-center gap-2 ${isCollapsed ? 'mx-auto' : ''}`}>
          <Button
            variant="ghost"
            size="icon"
            className={`h-6 w-6 p-0 ${isDark ? "text-white hover:bg-white/10" : "text-[#131920] hover:bg-gray-100"}`}
            onClick={() => onToggleCollapse?.()}
          >
            {isCollapsed ? <ChevronRightIcon className="w-6 h-6" /> : <ChevronLeftIcon className="w-6 h-6" />}
          </Button>

          {!isCollapsed && (
            <Button variant="ghost" size="icon" className={`h-6 w-6 p-0 ${isDark ? "text-white hover:bg-white/10" : "text-[#131920] hover:bg-gray-100"}`} onClick={() => onToggleVariant?.()}>
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
          )}
        </div>
      </header>

      <div className={`flex flex-col flex-1 items-start gap-6 pt-3.5 pb-6 px-3 relative self-stretch w-full overflow-hidden ${isDark ? "bg-[#0B0B15]" : "bg-white"}`}>
        <div className="flex flex-col gap-3 w-full flex-shrink-0">
          <Button
            className={`bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-lg inline-flex items-center gap-2 ${isCollapsed ? 'w-12 h-12 p-0 justify-center mx-auto' : 'px-3 py-2 w-full justify-center'}`}
            title={isCollapsed ? "New video" : undefined}
          >
            <PlusIcon className="w-4 h-4" />
            {!isCollapsed && <span className="text-sm font-semibold">New video</span>}
          </Button>

          {isCollapsed ? (
            <Button
              variant="ghost"
              className={`w-12 h-12 p-0 mx-auto rounded-lg ${isDark ? "text-gray-400 hover:bg-white/5" : "text-[#8896a9] hover:bg-neutral-100"}`}
              title="Search"
            >
              <SearchIcon className="w-4 h-4" />
            </Button>
          ) : (
            <div className="relative">
              <SearchIcon className={`absolute left-3 top-3 w-4 h-4 ${isDark ? "text-gray-500" : "text-[#8896a9]"}`} />
              <input
                className={`pl-10 pr-3 py-2 w-full rounded-[8px] text-sm border outline-none focus:ring-1 focus:ring-purple-500 transition-all ${isDark ? "bg-[#13111C] text-white border-[#2a2a3d] placeholder:text-gray-600" : "bg-neutral-50 text-[#131920] border-[#efeff0] placeholder:text-gray-500"}`}
                placeholder="Search..."
              />
            </div>
          )}
        </div>


        <nav className="flex flex-col items-start relative self-stretch w-full flex-1 overflow-y-auto overflow-x-hidden pr-1 gap-1">
          {navigationItems.map((item, index) => (
            <Button
              key={index}
              variant="ghost"
              onClick={() => onSelect?.(item.label)}
              className={`flex items-center gap-3 px-3 py-3 relative self-stretch w-full flex-[0_0_auto] h-auto ${isCollapsed ? 'justify-center' : 'justify-start'} ${active === item.label
                ? isDark
                  ? "bg-gradient-to-r from-[#6b4cff] to-[#9b5de5] text-white shadow-lg shadow-purple-500/25 rounded-xl border-none"
                  : "bg-neutral-100 rounded-lg text-[#131920] hover:bg-neutral-200 border-l-2 border-[#2563EB]"
                : isDark
                  ? "rounded-xl text-gray-400 hover:bg-white/5 hover:text-white"
                  : "rounded-lg text-[#6b7280] hover:bg-neutral-50 hover:text-[#131920]"
                }`}
              title={isCollapsed ? item.label : undefined}
            >
              <item.icon className={`w-5 h-5 ${active === item.label && isDark ? "text-white" : ""}`} />
              {!isCollapsed && (
                <>
                  <span className="relative flex-1 [font-family:'Inter',Helvetica] font-medium text-sm tracking-[0] leading-[normal] text-left">
                    {item.label}
                  </span>
                  {item.badge && (
                    <Badge className={`flex flex-col px-2 py-0.5 items-center justify-center gap-2.5 rounded-md ${isDark ? "bg-white/20 text-white backdrop-blur-md" : "bg-[#7c3aed] hover:bg-[#7c3aed]"}`}>
                      <span className="font-semibold text-[10px] [font-family:'Inter',Helvetica] tracking-[0] leading-[normal] uppercase">
                        {item.badge}
                      </span>
                    </Badge>
                  )}
                </>
              )}
            </Button>
          ))}
        </nav>

        <div className={`flex flex-col items-start gap-2 w-full flex-shrink-0 pt-4 border-t ${isDark ? "border-gray-700" : "border-gray-200"}`}>
          {/* Settings Button */}
          <Button
            variant="ghost"
            className={`flex items-center ${isCollapsed ? 'justify-center w-full' : 'justify-start w-full'} gap-2 p-3 rounded-lg ${active === "Settings"
              ? isDark
                ? "bg-white/10 text-white hover:bg-white/15 hover:text-white border-l-2 border-[#2563EB]"
                : "bg-neutral-100 text-[#131920] hover:bg-neutral-200 border-l-2 border-[#2563EB]"
              : isDark
                ? "text-gray-300 hover:bg-white/5 hover:text-white"
                : "text-[#6b7280] hover:bg-neutral-100 hover:text-[#131920]"
              }`}
            onClick={() => onSelect?.("Settings")}
            title={isCollapsed ? "Settings" : undefined}
          >
            <SettingsIcon className="w-5 h-5" />
            {!isCollapsed && <span className="text-sm font-medium">Settings</span>}
          </Button>

          {/* User Profile Section */}
          {!isCollapsed && (
            <div
              className={`flex items-center justify-between w-full p-3 rounded-lg cursor-pointer transition-colors ${active === "Settings"
                ? isDark ? "bg-white/10" : "bg-neutral-200"
                : isDark ? "bg-white/5 hover:bg-white/10" : "bg-gray-100 hover:bg-gray-200"
                }`}
              onClick={() => onSelect?.("Settings")}
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isDark ? "bg-white/10" : "bg-gray-300"}`}>
                  <span className={`text-sm font-semibold ${isDark ? "text-white" : "text-gray-700"}`}>
                    {localStorage.getItem("user_name")?.charAt(0) || "U"}
                  </span>
                </div>
                <span className={`text-sm font-medium truncate max-w-[120px] ${isDark ? "text-white" : "text-gray-900"}`}>
                  {localStorage.getItem("user_name") || "User"}
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className={`h-8 w-8 p-0 ${isDark ? "text-gray-400 hover:bg-white/10 hover:text-white" : "text-gray-500 hover:bg-white hover:text-red-600"}`}
                onClick={(e) => {
                  e.stopPropagation();
                  localStorage.clear();
                  window.location.href = "/";
                }}
                title="Logout"
              >
                <LogOutIcon className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* Collapsed state - just show logout icon */}
          {isCollapsed && (
            <Button
              variant="ghost"
              className={`flex items-center justify-center w-full gap-2 p-3 rounded-lg ${isDark ? "text-gray-300 hover:bg-white/5 hover:text-white" : "text-[#6b7280] hover:bg-neutral-100 hover:text-[#131920]"}`}
              onClick={() => {
                localStorage.clear();
                window.location.href = "/";
              }}
              title="Logout"
            >
              <LogOutIcon className="w-5 h-5" />
            </Button>
          )}
        </div>
      </div>
    </aside>
  );
};

import { useState } from "react";
import { SideNavigationSection } from "./sections/SideNavigationSection";
import { VideoLibrarySection } from "./sections/VideoLibrarySection";
import { HomeSection } from "./sections/HomeSection/HomeSection";
import { SettingsSection } from "./sections/SettingsSection/SettingsSection";
import { ComingSoonSection } from "./sections/ComingSoonSection/ComingSoonSection";

export const MericodSaasRecord = (): JSX.Element => {
  const [active, setActive] = useState<string>("Home");
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  return (
    <div className={`flex flex-col w-full min-w-[1440px] transition-colors duration-300 ${isDarkMode ? 'dark' : ''} ${isDarkMode ? 'bg-[#070510]' : 'bg-[#fbfbfc]'}`}>
      <div className="flex flex-1">
        <SideNavigationSection
          active={active}
          onSelect={setActive}
          variant={isDarkMode ? "dark" : "light"}
          onToggleVariant={() => setIsDarkMode(!isDarkMode)}
          isCollapsed={isCollapsed}
          onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
        />

        {/* Content area with dynamic left margin to account for fixed sidebar width */}
        <div className={`flex-1 transition-all duration-300 ${isCollapsed ? 'ml-[80px]' : 'ml-[268px]'}`}>
          {active === "Home" && <HomeSection />}
          {(active === "My Library" || active === "All Projects") && <VideoLibrarySection />}
          {active === "Settings" && <SettingsSection />}

          {/* Coming Soon Pages */}
          {(active === "Video Templates" || active === "Auto-update" || active === "Team" || active === "Analytics") && (
            <ComingSoonSection pageName={active} />
          )}
        </div>
      </div>
    </div>
  );
};

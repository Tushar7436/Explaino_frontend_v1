import {
  Crown,
  Languages,
  Scissors,
  Sparkles,
  Upload,
  Video,
  Zap,
} from "lucide-react";
import React, { useState, useEffect } from "react";
import { Avatar, AvatarFallback } from "../../../../components/ui/avatar";
import { Badge } from "../../../../components/ui/badge";
import { Card, CardContent } from "../../../../components/ui/card";
import { checkExtensionConnection, openExtension } from "../../../../utils/extensionUtils";
import { fetchProjectData } from "../../../../services/backend-api";

export const HomeSection = (): JSX.Element => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadProjects = async () => {
      try {
        setLoading(true);
        const clientId = localStorage.getItem("id");
        console.log("HomeSection - Client ID retrieved from localStorage:", clientId);
        
        if (clientId) {
          console.log("HomeSection - Making API call to fetch project data...");
          const projectData = await fetchProjectData(clientId);
          console.log("HomeSection - API response received:", projectData);
          setProjects(projectData.data?.projects || []);
          console.log("HomeSection - Projects set:", projectData.data?.projects || []);
        } else {
          console.log("HomeSection - No client ID found in localStorage");
        }
      } catch (err) {
        setError(err.message);
        console.error("HomeSection - Failed to fetch project data:", err);
      } finally {
        setLoading(false);
      }
    };

    loadProjects();
  }, []);

  return (
    <div className="flex-1 w-full min-h-screen bg-[#0B0C15] text-white p-10 font-[Inter] overflow-y-auto">
      {/* Header Banner */}
      <div className="w-full h-[240px] rounded-3xl relative overflow-hidden mb-12 bg-gradient-to-r from-[#17132B] to-[#120F24] border border-[#2A2B35]">
        {/* Abstract Bloom Effects to simulate floral */}
        <div className="absolute -left-20 -top-20 w-80 h-80 bg-purple-600/30 rounded-full blur-3xl" />
        <div className="absolute -right-20 -top-20 w-80 h-80 bg-pink-600/30 rounded-full blur-3xl" />

        <div className="relative z-10 w-full h-full flex flex-col items-center justify-center text-center px-4">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight">
            Make something awesome
          </h1>
          <p className="text-gray-400 text-lg">
            Create stunning product videos and docs
          </p>
        </div>
      </div>

      {/* Create new video */}
      <div className="mb-12">
        <div className="flex items-center gap-2 mb-6">
          <Video className="w-5 h-5 text-gray-400" />
          <h2 className="text-lg font-semibold text-white">
            Create a new video
          </h2>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Card 1: Record screen */}
          <Card
            className="bg-[#151226] border-[#2A2B35] text-white hover:border-gray-600 transition-colors cursor-pointer group h-[160px] overflow-hidden"
            onClick={async () => {
              const isConnected = await checkExtensionConnection();
              if (isConnected) {
                const clientId = localStorage.getItem("user_id");
                openExtension(clientId || undefined);
              } else {
                window.open("https://chromewebstore.google.com/detail/desklamp/ioiblpkpkombnhjbojlcjocfcomhnlgn", "_blank");
              }
            }}
          >
            <CardContent className="p-0 h-full flex flex-row">
              <div className="flex-1 p-6 flex flex-col justify-start z-10">
                <h3 className="font-semibold text-white mb-2 text-lg">Record screen</h3>
                <p className="text-xs text-gray-400 leading-relaxed max-w-[160px]">
                  Turn a screen-recording into a studio-style video.
                </p>
                <div className="w-10 h-1 bg-yellow-500 rounded-full mt-auto" />
              </div>
              {/* Right side Graphics */}
              <div className="w-[160px] h-full relative bg-[#1C192E] flex items-center justify-center overflow-hidden">
                <div className="w-[120%] h-[80%] bg-[#2A2640] rounded-lg border border-[#3A3650] absolute -right-6 top-6 transform -rotate-3 transition-transform group-hover:rotate-0" />
                <div className="w-[120%] h-[80%] bg-[#221f36] rounded-lg border border-[#3A3650] absolute -right-10 top-10 transform rotate-2 opacity-50" />

                <div className="absolute bottom-4 right-6 bg-[#3A2640] px-2 py-1 rounded flex items-center gap-1.5 border border-red-500/20 shadow-lg z-20">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-[10px] font-bold text-gray-200">REC</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Upload a video */}
          <Card className="bg-[#151226] border-[#2A2B35] text-white hover:border-gray-600 transition-colors cursor-pointer group h-[160px] overflow-hidden">
            <CardContent className="p-0 h-full flex flex-row">
              <div className="flex-1 p-6 flex flex-col justify-start z-10">
                <h3 className="font-semibold text-white mb-2 text-lg">Upload a video</h3>
                <p className="text-xs text-gray-400 leading-relaxed max-w-[160px]">
                  Upload a screen recording. Get a studio-style video.
                </p>
              </div>
              {/* Right side Graphics */}
              <div className="w-[160px] h-full relative bg-[#1C192E] flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-28 h-20 bg-[#2A2640] rounded-lg border border-[#3A3650] border-dashed flex items-center justify-center transform rotate-6 transition-transform group-hover:rotate-0">
                    <Upload className="text-gray-500 w-8 h-8" />
                  </div>
                </div>
                {/* Decorative elements */}
                <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-blue-500/20" />
                <div className="absolute bottom-4 left-4 w-4 h-4 rounded-full border border-gray-600/30" />
              </div>
            </CardContent>
          </Card>

          {/* Card 3: Upload a slide deck */}
          <Card className="bg-[#151226] border-[#2A2B35] text-white hover:border-gray-600 transition-colors cursor-pointer group h-[160px] overflow-hidden">
            <CardContent className="p-0 h-full flex flex-row">
              <div className="flex-1 p-6 flex flex-col justify-start z-10">
                <h3 className="font-semibold text-white mb-2 text-lg">Upload a slide deck</h3>
                <p className="text-xs text-gray-400 leading-relaxed max-w-[160px]">
                  Turn any PDF or PPT into a narrated video.
                </p>
              </div>
              {/* Right side Graphics */}
              <div className="w-[160px] h-full relative bg-[#1C192E] flex items-center justify-center overflow-hidden">
                <div className="absolute top-8 right-8 flex flex-col gap-2 opacity-60">
                  <div className="w-24 h-12 bg-[#3A3650] rounded border border-gray-600/20 transform -rotate-2" />
                  <div className="w-24 h-12 bg-[#3A3650] rounded border border-gray-600/20 transform rotate-1" />
                </div>
                <div className="absolute top-6 right-10 w-28 h-24 bg-gradient-to-br from-[#C4B5FD]/10 to-transparent border border-[#C4B5FD]/10 rounded-lg backdrop-blur-[2px] transform rotate-3 transition-transform group-hover:rotate-0" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* AI Tools */}
      <div className="mb-12">
        <div className="flex items-center gap-3 mb-6">
          <Sparkles className="w-4 h-4 text-gray-400" />
          <h2 className="text-lg font-semibold text-white">AI tools</h2>
          <Badge className="bg-[#4C3B85] text-[#C4B5FD] hover:bg-[#4C3B85] border-0 text-[10px] px-2 py-0.5 h-auto">
            NEW
          </Badge>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Tool 1 */}
          <div className="bg-[#151226] border border-[#2A2B35] rounded-xl p-5 flex items-center gap-4 hover:border-gray-600 transition-colors cursor-pointer relative overflow-hidden group">
            <div className="w-12 h-12 rounded-lg bg-[#241F3D] flex items-center justify-center text-purple-400 shrink-0">
              <Scissors size={20} />
            </div>
            <div>
              <h3 className="font-medium text-white mb-1">Cuts</h3>
              <p className="text-xs text-gray-400">
                Break down a long video into bite-sized clips and docs
              </p>
            </div>
            <div className="absolute top-4 right-4 text-[#4C3B85]">
              <Crown size={14} />
            </div>
          </div>

          {/* Tool 2 */}
          <div className="bg-[#151226] border border-[#2A2B35] rounded-xl p-5 flex items-center gap-4 hover:border-gray-600 transition-colors cursor-pointer relative overflow-hidden group">
            <div className="w-12 h-12 rounded-lg bg-[#241F3D] flex items-center justify-center text-purple-400 shrink-0">
              <Zap size={20} />
            </div>
            <div>
              <h3 className="font-medium text-white mb-1">Auto-update</h3>
              <p className="text-xs text-gray-400">
                Update content when your product changes
              </p>
            </div>
            <div className="absolute top-4 right-4 text-[#4C3B85]">
              <Crown size={14} />
            </div>
          </div>

          {/* Tool 3 */}
          <div className="bg-[#151226] border border-[#2A2B35] rounded-xl p-5 flex items-center gap-4 hover:border-gray-600 transition-colors cursor-pointer relative overflow-hidden group">
            <div className="w-12 h-12 rounded-lg bg-[#241F3D] flex items-center justify-center text-purple-400 shrink-0">
              <Languages size={20} />
            </div>
            <div>
              <h3 className="font-medium text-white mb-1">Translator</h3>
              <p className="text-xs text-gray-400">
                Dub a video into 37+ languages
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Projects */}
      <div className="w-full">
        <h2 className="text-lg font-semibold text-white mb-6">
          Recent projects
        </h2>

        <div className="w-full border border-[#2A2B35] rounded-xl overflow-hidden bg-[#12131C]">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-4 p-5 border-b border-[#2A2B35] text-sm text-gray-400 font-medium h-[60px] items-center">
            <div className="col-span-5 pl-4">Project</div>
            <div className="col-span-3">Creator</div>
            <div className="col-span-1">Updated</div>
            <div className="col-span-1">Created</div>
            <div className="col-span-2 pl-4">Help Center</div>
          </div>

          {/* Table Body */}
          <div className="flex flex-col">
            {loading ? (
              <div className="p-8 text-center text-gray-400">
                Loading projects...
              </div>
            ) : error ? (
              <div className="p-8 text-center text-red-400">
                Error loading projects: {error}
              </div>
            ) : projects.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                No projects found
              </div>
            ) : (
              projects.map((project, index) => (
              <div
                key={project.id || index}
                className="grid grid-cols-12 gap-4 p-5 border-b border-[#2A2B35] last:border-0 items-center hover:bg-[#1C1D26] transition-colors group cursor-pointer"
              >
                {/* Project Name */}
                <div className="col-span-5 font-semibold text-white pl-4 group-hover:text-[#EC4899] transition-colors">
                  {project.project_name || project.display_title || 'Untitled Project'}
                </div>

                {/* Creator */}
                <div className="col-span-3 flex items-center gap-3">
                  <Avatar className="h-9 w-9 border-2 border-[#0B0C15]">
                    <AvatarFallback className="bg-[#14b8a6] text-white font-medium text-sm">
                      {(project.owner_details?.name || 'U').charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-white leading-tight">
                      {project.owner_details?.name || 'Unknown User'}
                    </span>
                    <span className="text-xs text-gray-500 mt-0.5">
                      {project.owner_details?.email || ''}
                    </span>
                  </div>
                </div>

                {/* Dates */}
                <div className="col-span-1 text-sm text-gray-400 font-medium">
                  {project.updated_at ? new Date(project.updated_at).toLocaleDateString() : ''}
                </div>
                <div className="col-span-1 text-sm text-gray-400 font-medium">
                  {project.created_at ? new Date(project.created_at).toLocaleDateString() : ''}
                </div>

                {/* Status Badge */}
                <div className="col-span-2 pl-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#1C1D26] border border-[#2A2B35]">
                    <div className="w-2 h-2 rounded-full bg-gray-500" />
                    <span className="text-xs font-medium text-gray-300">
                      {project.status || 'Unpublished'}
                    </span>
                  </div>
                </div>
              </div>
            ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

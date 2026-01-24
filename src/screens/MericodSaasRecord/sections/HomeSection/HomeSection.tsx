import {
  Crown,
  Languages,
  Scissors,
  Sparkles,
  Video,
  Zap,
} from "lucide-react";
import React from "react";
import { Avatar, AvatarFallback } from "../../../../components/ui/avatar";
import { Badge } from "../../../../components/ui/badge";
import { Card, CardContent } from "../../../../components/ui/card";
import { checkExtensionConnection, openExtension } from "../../../../utils/extensionUtils";
import { fetchExplainoProjects } from "../../../../services/graphql-api";

interface Project {
  project_name: string;
  created_at: string;
  updated_at: string;
  client_id: string;
  id: string;
  session_id: string;
}

const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    
    // Format as "23 Jan 2026"
    return date.toLocaleDateString("en-US", { 
      day: "numeric", 
      month: "short", 
      year: "numeric"
    });
  } catch {
    return dateString;
  }
};

export const HomeSection = (): JSX.Element => {
  const [greeting, setGreeting] = React.useState("Good morning");
  const [userName, setUserName] = React.useState("User");
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    // Set greeting
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good morning");
    else if (hour < 18) setGreeting("Good afternoon");
    else setGreeting("Good evening");

    // Set user name
    const storedName = localStorage.getItem("user_name");
    if (storedName) {
      // If full name, take first name for a friendlier greeting
      const firstName = storedName.split(' ')[0];
      setUserName(firstName);
    }

    // Fetch projects
    const loadProjects = async () => {
      const clientId = localStorage.getItem("user_id");
      if (clientId) {
        const fetchedProjects = await fetchExplainoProjects(clientId);
        if (fetchedProjects) {
          setProjects(fetchedProjects);
        }
      }
      setLoading(false);
    };

    loadProjects();
  }, []);

  return (
    <div className="flex-1 w-full min-h-screen bg-[#0B0C15] text-white p-10 font-[Inter] overflow-y-auto">
      {/* Header Banner */}
      <div
        className="w-full h-[240px] rounded-3xl relative overflow-hidden mb-12 bg-cover bg-center border border-[#2A2B35]"
        style={{
          backgroundImage: "url('https://cdn.vocallabs.ai/landing_page/8145065f-c555-4433-b5ee-860ed950083b.png')"
        }}
      >
        {/* Abstract Bloom Effects to simulate floral */}
        <div className="absolute -left-20 -top-20 w-80 h-80 bg-purple-600/30 rounded-full blur-3xl" />
        <div className="absolute -right-20 -top-20 w-80 h-80 bg-pink-600/30 rounded-full blur-3xl" />

        <div className="relative z-10 w-full h-full flex flex-col items-center justify-center text-center px-4">
          <h2 className="text-2xl md:text-3xl font-semibold mb-2 tracking-tight">
            {greeting}, {userName}!
          </h2>
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
              <div
                className="w-[180px] h-full relative bg-contain bg-center bg-no-repeat"
                style={{
                  backgroundImage: "url('https://cdn.vocallabs.ai/landing_page/f6964f25-d56d-46ad-a309-3fbf420e2278.png')"
                }}
              />
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
              <div
                className="w-[160px] h-full relative bg-contain bg-center bg-no-repeat"
                style={{
                  backgroundImage: "url('https://cdn.vocallabs.ai/landing_page/433f7c14-ff1a-43ca-86ff-3289b7272fa6.png')"
                }}
              />
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
              <div
                className="w-[160px] h-full relative bg-contain bg-center bg-no-repeat"
                style={{
                  backgroundImage: "url('https://cdn.vocallabs.ai/landing_page/aa343b2c-284b-45ff-89f2-44976d9f24c6.png')"
                }}
              />
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
            ) : projects.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                No projects yet. Create your first project!
              </div>
            ) : (
              projects.map((project) => (
                <div
                  key={project.id}
                  className="grid grid-cols-12 gap-4 p-5 border-b border-[#2A2B35] last:border-0 items-center hover:bg-[#1C1D26] transition-colors group cursor-pointer"
                >
                  {/* Project Name */}
                  <div className="col-span-5 font-semibold text-white pl-4 group-hover:text-[#EC4899] transition-colors">
                    {project.project_name}
                  </div>

                  {/* Creator - Using current user */}
                  <div className="col-span-3 flex items-center gap-3">
                    <Avatar className="h-9 w-9 border-2 border-[#0B0C15]">
                      <AvatarFallback className="bg-[#14b8a6] text-white font-medium text-sm">
                        {(localStorage.getItem("user_name") || "U").charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-white leading-tight">
                        {localStorage.getItem("user_name") || "You"}
                      </span>
                      <span className="text-xs text-gray-500 mt-0.5">
                        {localStorage.getItem("user_email") || localStorage.getItem("email") || "user@example.com"}
                      </span>
                    </div>
                  </div>

                  {/* Updated Date */}
                  <div className="col-span-1 text-sm text-gray-400 font-medium">
                    {formatDate(project.updated_at)}
                  </div>

                  {/* Created Date */}
                  <div className="col-span-1 text-sm text-gray-400 font-medium">
                    {formatDate(project.created_at)}
                  </div>

                  {/* Status Badge */}
                  <div className="col-span-2 pl-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#1C1D26] border border-[#2A2B35]">
                      <div className="w-2 h-2 rounded-full bg-gray-500" />
                      <span className="text-xs font-medium text-gray-300">
                        In Progress
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

import { Folder, Home, Plus } from "lucide-react";
import { Avatar, AvatarFallback } from "../../../../components/ui/avatar";
import { Button } from "../../../../components/ui/button";

const projects = [
  {
    id: 1,
    title: "Deploying Projects Using Vercel",
    updated: "21 Dec 2025",
    created: "2 Dec 2025",
  },
  {
    id: 2,
    title: "Vercel Project Deployment Tool",
    updated: "13 Jan 2026",
    created: "21 Dec 2025",
  },
  {
    id: 3,
    title: "GitHub Project Overview",
    updated: "2 Jan 2026",
    created: "22 Dec 2025",
  },
];

export const VideoLibrarySection = (): JSX.Element => {
  return (
    <div className="flex flex-col w-full min-h-screen bg-[#0B0C15] text-white p-10 font-[Inter]">
      {/* Header */}
      <div className="flex flex-col gap-8 w-full mb-12">
        <div className="flex items-center gap-2 text-gray-400 hover:text-white cursor-pointer transition-colors w-fit">
          <Home size={20} />
        </div>

        <h1 className="text-3xl font-bold tracking-tight text-white">Projects</h1>

        <div className="flex items-center gap-4 mt-2">
          <Button className="bg-[#EC4899] hover:bg-[#DB2777] text-white gap-2 px-6 h-12 rounded-lg font-semibold shadow-lg shadow-pink-500/20 transition-all text-base">
            <Plus size={20} />
            New Video
          </Button>

          <Button
            variant="outline"
            className="bg-transparent border-[#2A2B35] text-gray-300 hover:bg-[#2A2B35] hover:text-white gap-2 px-6 h-12 rounded-lg font-semibold text-base"
          >
            <Folder size={20} />
            New Folder
          </Button>
        </div>
      </div>

      {/* Projects List */}
      <div className="w-full">
        <h2 className="text-gray-400 font-semibold mb-6 text-sm">Projects</h2>

        <div className="w-full border border-[#2A2B35] rounded-xl overflow-hidden bg-[#12131C]">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-4 p-5 border-b border-[#2A2B35] text-sm text-gray-400 font-medium">
            <div className="col-span-5 pl-4">Project</div>
            <div className="col-span-3">Creator</div>
            <div className="col-span-1">Updated</div>
            <div className="col-span-1">Created</div>
            <div className="col-span-2 pl-4">Help Center</div>
          </div>

          {/* Table Body */}
          <div className="flex flex-col">
            {projects.map((project) => (
              <div
                key={project.id}
                className="grid grid-cols-12 gap-4 p-5 border-b border-[#2A2B35] last:border-0 items-center hover:bg-[#1C1D26] transition-colors group cursor-pointer"
              >
                {/* Project Name */}
                <div className="col-span-5 font-semibold text-white pl-4 group-hover:text-[#EC4899] transition-colors">
                  {project.title}
                </div>

                {/* Creator */}
                <div className="col-span-3 flex items-center gap-3">
                  <Avatar className="h-9 w-9 border-2 border-[#0B0C15]">
                    <AvatarFallback className="bg-[#14b8a6] text-white font-medium text-sm">T</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-white leading-tight">Tushar Agarwal</span>
                    <span className="text-xs text-gray-500 mt-0.5">tushar7436@gmail.com</span>
                  </div>
                </div>

                {/* Dates */}
                <div className="col-span-1 text-sm text-gray-400 font-medium">
                  {project.updated}
                </div>
                <div className="col-span-1 text-sm text-gray-400 font-medium">
                  {project.created}
                </div>

                {/* Status Badge */}
                <div className="col-span-2 pl-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#1C1D26] border border-[#2A2B35]">
                    <div className="w-2 h-2 rounded-full bg-gray-500" />
                    <span className="text-xs font-medium text-gray-300">Unpublished</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

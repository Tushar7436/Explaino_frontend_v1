import {
  ChevronDownIcon,
  EyeIcon,
  MessageSquareIcon,
  PlusIcon,
  SearchIcon,
  SmileIcon,
} from "lucide-react";
import React, { useState } from "react";
import { Avatar, AvatarFallback } from "../../../../components/ui/avatar";
import { Badge } from "../../../../components/ui/badge";
import { Button } from "../../../../components/ui/button";
import { Card, CardContent } from "../../../../components/ui/card";
import { Input } from "../../../../components/ui/input";
import { Separator } from "../../../../components/ui/separator";

const tabItems = [
  { id: "videos", label: "Videos", active: true },
  { id: "starred", label: "Starred Videos", active: false },
  { id: "screenshot", label: "Screnshoot", active: false },
  { id: "archived", label: "Archived", active: false },
];

const folderData = [
  {
    id: 1,
    title: "Marchelina Client Meeting Record",
    videoCount: 4,
    vectorSrc: "/vector-3.svg",
  },
  {
    id: 2,
    title: "Drakula - New Page Brief Meeting",
    videoCount: 2,
    vectorSrc: "/vector-3-1.svg",
  },
  {
    id: 3,
    title: "Michael - New Project Brief Meeting",
    videoCount: 3,
    vectorSrc: "/vector-3-2.svg",
  },
];

const videoData = [
  {
    id: 1,
    timeAgo: "12 min ago",
    title: "Samaran - Homepage Report",
    duration: "4 Min",
    views: 6,
    comments: 6,
    reactions: 4,
    starred: false,
  },
  {
    id: 2,
    timeAgo: "1 hours ago",
    title: "Drakula - Shopping Report",
    duration: "2 Min",
    views: 2,
    comments: 1,
    reactions: 1,
    starred: true,
  },
  {
    id: 3,
    timeAgo: "2 hours ago",
    title: "Marchelina - Detail Report",
    duration: "3 Min",
    views: 6,
    comments: 2,
    reactions: 4,
    starred: true,
  },
  {
    id: 4,
    timeAgo: "2 hours ago",
    title: "New Project Brief Explanation",
    duration: "2 Min",
    views: 3,
    comments: 0,
    reactions: 0,
    starred: true,
  },
  {
    id: 5,
    timeAgo: "12 min ago",
    title: "Samaran - Homepage Report",
    duration: "3 Min",
    views: 4,
    comments: 4,
    reactions: 4,
    starred: false,
  },
  {
    id: 6,
    timeAgo: "12 min ago",
    title: "Samaran - Homepage Report",
    duration: "1 Min",
    views: 4,
    comments: 4,
    reactions: 4,
    starred: false,
  },
  {
    id: 7,
    timeAgo: "12 min ago",
    title: "Samaran - Homepage Report",
    duration: "5 Min",
    views: 4,
    comments: 4,
    reactions: 4,
    starred: false,
  },
  {
    id: 8,
    timeAgo: "12 min ago",
    title: "Samaran - Homepage Report",
    duration: "4 Min",
    views: 4,
    comments: 4,
    reactions: 4,
    starred: false,
  },
];

export const VideoLibrarySection = (): JSX.Element => {
  const [activeTab, setActiveTab] = useState("videos");

  return (
    <div className="flex flex-col w-full items-start gap-10 px-4 py-6">
      <div className="flex flex-col items-start gap-11 w-full">
        <header className="flex items-center justify-between w-full">
          <h1 className="[font-family:'Inter',Helvetica] font-semibold text-[#131920] text-[28px] tracking-[0] leading-[normal]">
            My Library
          </h1>

          <div className="flex items-center justify-end gap-6 flex-1 ml-6">
            <div className="flex items-center gap-2.5 px-5 py-3.5 flex-1 max-w-[494px] rounded-[100px] border-[1.5px] border-solid border-[#f0f0f3]">
              <SearchIcon className="w-5 h-5 text-[#1319204c]" />
              <Input
                type="text"
                placeholder="SearchIcon your videos, folder, report, tags, idea"
                className="border-0 p-0 h-auto [font-family:'Inter',Helvetica] font-medium text-[#1319204c] text-base focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>

            <div className="inline-flex items-center gap-2.5">
              <img
                className="flex-[0_0_auto]"
                alt="Profile"
                src="/profile.svg"
              />

              <img className="w-px h-[25px]" alt="Vector" src="/vector-2.svg" />

              <button className="inline-flex items-center gap-4 rounded-[100px] overflow-hidden">
                <div className="inline-flex items-center gap-2">
                  <Avatar className="w-11 h-11">
                    <AvatarFallback className="bg-[#d9d9d9]" />
                  </Avatar>

                  <span className="[font-family:'Inter',Helvetica] font-semibold text-[#333333] text-base tracking-[0] leading-[normal] whitespace-nowrap">
                    Hancraft
                  </span>
                </div>

                <ChevronDownIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        <nav className="flex items-center justify-between w-full">
          <div className="inline-flex items-start gap-2">
            {tabItems.map((tab) => (
              <Button
                key={tab.id}
                variant={tab.active ? "default" : "outline"}
                className={`h-12 px-5 py-3.5 rounded-[100px] ${
                  tab.active
                    ? "bg-[#7433ff] text-white hover:bg-[#7433ff]/90"
                    : "bg-neutral-50 border-[1.5px] border-[#f0f0f3] text-[#13192080] hover:bg-neutral-100"
                } [font-family:'Inter',Helvetica] font-semibold text-base`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </Button>
            ))}
          </div>

          <div className="inline-flex items-start gap-3">
            <img
              className="flex-[0_0_auto]"
              alt="Frame"
              src="/frame-26-1.svg"
            />

            <Button
              variant="outline"
              className="inline-flex items-center justify-center gap-2 pl-5 pr-4 py-3.5 bg-white rounded-[100px] border-[1.5px] border-[#0000001a] hover:bg-gray-50"
            >
              <span className="[font-family:'Inter',Helvetica] font-semibold text-[#131920] text-base tracking-[0] leading-[normal] whitespace-nowrap">
                New Folder
              </span>
              <PlusIcon className="w-5 h-5" />
            </Button>
          </div>
        </nav>
      </div>

      <div className="inline-flex flex-col items-start gap-7 w-full">
        <section className="flex flex-col items-start gap-6 w-full">
          <div className="flex items-center w-full">
            <Badge
              variant="secondary"
              className="inline-flex items-center justify-center gap-2.5 px-3 py-1.5 bg-[#f6f6f8] rounded-xl border border-solid border-[#0000000f] [font-family:'Inter',Helvetica] font-semibold text-[#13192080] text-base"
            >
              Folder
            </Badge>

            <Separator className="flex-1 mx-4" />

            <div className="inline-flex items-center justify-center gap-2.5 px-3 py-2 rounded-[100px]">
              <span className="[font-family:'Inter',Helvetica] font-semibold text-[#13192080] text-sm tracking-[0] leading-[normal]">
                3 Folders
              </span>
            </div>
          </div>

          <div className="flex items-start gap-5 w-full">
            {folderData.map((folder) => (
              <div
                key={folder.id}
                className="flex-col items-start gap-1 flex-1 inline-flex relative cursor-pointer hover:opacity-80 transition-opacity"
              >
                <img
                  className="w-[85.48px] h-[33px] mt-[-2.50px] ml-[-6.50px]"
                  alt="Vector"
                  src={folder.vectorSrc}
                />

                <Card className="w-full bg-[#f9f9fa] rounded-[0px_14px_14px_14px] border border-solid border-[#dddde3] shadow-[0px_2px_12px_#0000000a]">
                  <CardContent className="flex flex-col items-start gap-3 p-5">
                    <h3 className="[font-family:'Inter',Helvetica] font-semibold text-[#131920] text-base tracking-[0] leading-[normal]">
                      {folder.title}
                    </h3>

                    <p className="[font-family:'Inter',Helvetica] font-semibold text-[#13192080] text-sm tracking-[0] leading-[normal]">
                      {folder.videoCount} Video
                    </p>
                  </CardContent>
                </Card>

                <div className="absolute top-[5px] left-[5px] w-2.5 h-2.5 bg-white rounded-[5px] border border-solid border-[#e2e2e8]" />
                <div className="absolute top-[5px] left-[19px] w-2.5 h-2.5 bg-white rounded-[5px] border border-solid border-[#e2e2e8]" />
              </div>
            ))}
          </div>
        </section>

        <section className="flex flex-col items-start gap-6 w-full">
          <div className="flex items-center w-full">
            <Badge
              variant="secondary"
              className="inline-flex items-center justify-center gap-2.5 px-3 py-1.5 bg-[#f6f6f8] rounded-xl border border-solid border-[#0000000f] [font-family:'Inter',Helvetica] font-semibold text-[#13192080] text-base whitespace-nowrap"
            >
              All Videos
            </Badge>

            <Separator className="flex-1 mx-4" />

            <div className="inline-flex items-center justify-center gap-2.5 px-3 py-2 rounded-[100px]">
              <span className="[font-family:'Inter',Helvetica] font-semibold text-[#13192080] text-sm tracking-[0] leading-[normal]">
                12 Videos
              </span>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-5 w-full">
            {videoData.map((video) => (
              <Card
                key={video.id}
                className="flex flex-col items-start gap-4 bg-white rounded-2xl overflow-hidden border border-solid border-[#e5e5e6] hover:shadow-lg transition-shadow cursor-pointer"
              >
                <div className="relative w-full h-[162px] bg-[#0000001a] rounded-[12px_12px_0px_0px]">
                  <Avatar className="absolute top-2.5 left-2.5 w-11 h-11 border-2 border-solid border-white">
                    <AvatarFallback className="bg-[#f1f1f1]" />
                  </Avatar>

                  <Badge className="absolute top-[129px] right-2.5 bg-white text-[#131920] hover:bg-white [font-family:'Inter',Helvetica] font-medium text-xs px-2.5 py-[5px]">
                    {video.duration}
                  </Badge>

                  {video.starred && (
                    <img
                      className="absolute top-2 right-2 w-7 h-7"
                      alt="Frame"
                      src={`/frame-39${video.id === 2 ? "" : video.id === 3 ? "-2" : video.id === 4 ? "-1" : ""}.svg`}
                    />
                  )}
                </div>

                <CardContent className="flex flex-col items-start gap-5 pt-0 pb-4 px-3.5 w-full">
                  <div className="flex flex-col items-start gap-1.5 w-full">
                    <p className="[font-family:'Inter',Helvetica] font-semibold text-[#13192080] text-sm tracking-[0] leading-[normal]">
                      {video.timeAgo}
                    </p>

                    <h3 className="[font-family:'Inter',Helvetica] font-semibold text-[#131920] text-base tracking-[0] leading-[normal]">
                      {video.title}
                    </h3>
                  </div>

                  <div className="flex items-start gap-1 w-full">
                    <div className="flex items-center justify-center gap-1 pl-2.5 pr-3 py-2 flex-1 bg-[#f6f6f8] rounded-[100px]">
                      <EyeIcon className="w-4 h-4 text-[#131920b2]" />
                      <span className="[font-family:'Inter',Helvetica] font-medium text-[#131920b2] text-sm tracking-[0] leading-[normal]">
                        {video.views}
                      </span>
                    </div>

                    <div className="flex items-center justify-center gap-1 pl-2.5 pr-3 py-2 flex-1 bg-[#f6f6f8] rounded-[100px]">
                      <MessageSquareIcon className="w-4 h-4 text-[#131920b2]" />
                      <span className="[font-family:'Inter',Helvetica] font-medium text-[#131920b2] text-sm tracking-[0] leading-[normal]">
                        {video.comments}
                      </span>
                    </div>

                    <div className="flex items-center justify-center gap-1 pl-2.5 pr-3 py-2 flex-1 bg-[#f6f6f8] rounded-[100px]">
                      <SmileIcon className="w-4 h-4 text-[#131920b2]" />
                      <span className="[font-family:'Inter',Helvetica] font-medium text-[#131920b2] text-sm tracking-[0] leading-[normal]">
                        {video.reactions}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

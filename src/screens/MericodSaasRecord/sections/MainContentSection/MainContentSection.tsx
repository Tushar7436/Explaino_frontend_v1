import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  RotateCwIcon,
  SearchIcon,
  XIcon,
} from "lucide-react";
import React from "react";
import { Avatar, AvatarFallback } from "../../../../components/ui/avatar";
import { Button } from "../../../../components/ui/button";

export const MainContentSection = (): JSX.Element => {
  const windowControls = [
    { color: "bg-[#ff6058]", border: "border-[#e14942]" },
    { color: "bg-[#ffc130]", border: "border-[#e1a325]" },
    { color: "bg-[#27ca40]", border: "border-[#3eaf3f]" },
  ];

  return (
    <div className="w-full relative">
      <div className="w-full flex flex-col">
        <div className="flex-1 w-full flex items-center gap-[7px] bg-[#dee1e6] h-[42px]">
          <div className="mt-px h-3 w-[52px] relative ml-[13px] flex items-center gap-2">
            {windowControls.map((control, index) => (
              <div
                key={index}
                className={`${control.color} ${control.border} w-3 h-3 rounded-md border-[0.5px] border-solid`}
              />
            ))}
          </div>

          <div className="mt-2 w-[167px] flex items-center">
            <div className="ml-2 w-[131px] flex">
              <div className="flex w-[171px] h-[34px] -ml-1.5 relative items-center gap-2">
                <div className="inline-flex items-start relative flex-[0_0_auto]">
                  <img
                    className="relative w-1.5 h-2"
                    alt="Curve l"
                    src="/curve-l.svg"
                  />

                  <div className="inline-flex items-center gap-1 p-2 relative flex-[0_0_auto] bg-white rounded-[8px_8px_0px_0px] overflow-hidden">
                    <img
                      className="relative w-4 h-3 ml-[-0.50px]"
                      alt="Vector"
                      src="/vector.svg"
                    />

                    <div className="relative [display:-webkit-box] items-center justify-center w-[90px] h-3.5 [font-family:'Roboto',Helvetica] font-normal text-[#494c4f] text-xs tracking-[0.20px] leading-[normal] whitespace-nowrap overflow-hidden text-ellipsis [-webkit-line-clamp:0] [-webkit-box-orient:vertical]">
                      Mericod - recor
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-[18px] h-[18px] p-0 hover:bg-transparent"
                    >
                      <XIcon className="w-[18px] h-[18px]" />
                    </Button>
                  </div>

                  <img
                    className="relative w-1.5 h-2"
                    alt="Curve r"
                    src="/curve-r.svg"
                  />
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  className="w-5 h-5 p-0 mr-[-16.00px] hover:bg-transparent"
                >
                  <PlusIcon className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="w-full h-[38px] flex">
          <div className="h-[38px] flex-1 relative bg-white shadow-[inset_0px_-1px_0px_#dadce0]">
            <div className="inline-flex items-center gap-[13px] absolute top-[calc(50.00%_-_11px)] right-3.5 overflow-hidden">
              <img
                className="relative w-[22px] h-[22px]"
                alt="Schrijven logo"
                src="/schrijven-logo.png"
              />

              <Avatar className="w-6 h-6 mt-[-1.00px] mb-[-1.00px] rounded-xl">
                <AvatarFallback className="bg-[#d9d9d9] rounded-xl" />
              </Avatar>

              <Button
                variant="ghost"
                size="icon"
                className="w-4 h-4 p-0 hover:bg-transparent"
              >
                <img
                  className="w-[18.75%] h-[75.00%]"
                  alt="Container"
                  src="/container-2.svg"
                />
              </Button>
            </div>

            <div className="absolute w-[calc(100%_-_250px)] top-[calc(50.00%_-_14px)] left-[134px] h-7 bg-[#f1f3f4] rounded-[14px] overflow-hidden flex items-center">
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-[calc(50.00%_-_6px)] left-[11px] w-3 h-3 p-0 hover:bg-transparent"
              >
                <img
                  className="w-[66.67%] h-[87.50%]"
                  alt="Container"
                  src="/container-1.svg"
                />
              </Button>

              <div className="absolute top-[calc(50.00%_-_8px)] left-[33px] w-[165px] h-4 flex">
                <div className="w-[151px] h-4 items-center inline-flex relative">
                  <div className="relative flex items-center justify-center w-fit mt-[-1.00px] [font-family:'Roboto',Helvetica] font-normal text-[#202124] text-sm tracking-[0.25px] leading-[normal] whitespace-nowrap">
                    mericod.com
                  </div>

                  <div className="relative flex items-center justify-center w-fit mt-[-1.00px] [font-family:'Roboto',Helvetica] font-normal text-[#696a6c] text-sm tracking-[0.25px] leading-[normal] whitespace-nowrap">
                    /mylibrary
                  </div>
                </div>
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="absolute top-[calc(50.00%_-_8px)] right-2.5 w-4 h-4 p-0 hover:bg-transparent"
              >
                <SearchIcon className="w-3 h-3" />
              </Button>
            </div>

            <div className="absolute top-[calc(50.00%_-_8px)] left-3 w-[109px] h-4 flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="w-4 h-4 p-0 hover:bg-transparent"
              >
                <ChevronLeftIcon className="w-4 h-4" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="w-4 h-4 p-0 hover:bg-transparent"
              >
                <ChevronRightIcon className="w-4 h-4" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="w-4 h-4 p-0 hover:bg-transparent"
              >
                <RotateCwIcon className="w-4 h-4" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="w-4 h-4 p-0 hover:bg-transparent"
              >
                <img
                  className="w-[75.02%] h-[74.99%]"
                  alt="Container"
                  src="/container-3.svg"
                />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

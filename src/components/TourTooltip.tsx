import React from "react";
import { TooltipRenderProps } from "react-joyride";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export const TourTooltip = ({
  index,
  step,
  tooltipProps,
  primaryProps,
  backProps,
  skipProps,
  isLastStep,
  size,
  closeProps,
}: TooltipRenderProps) => {

  // Common wrapper logic
  return (
    <div
      {...tooltipProps}
      className="relative max-w-[90vw] mobile:max-w-md rounded-xl p-6 shadow-xl bg-gradient-to-r from-[#29A6B4] to-[#9ED2C3] text-white"
    >
      {/* Close Button */}
      <button
        {...closeProps}
        className="absolute right-4 top-4 hover:opacity-70 text-white"
      >
        <X className="h-5 w-5" />
      </button>

      {/* Content */}
      <div className="mb-6 mt-2">
        {step.title && (
          <h3 className="mb-2 text-xl font-bold">{step.title}</h3>
        )}
        <div className="text-base leading-relaxed opacity-90">
          {step.content}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between ">
        <div className="flex w-full items-center justify-between gap-3">
          {/* Left Control - Back */}
          <button
            {...backProps}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors",
              index === 0 && "invisible"
            )}
          >
            <ChevronLeft className="h-5 w-5 text-white" />
          </button>

          {/* Dots */}
          <div className="text-white font-medium">
            {index + 1} / {size}
          </div>

          {/* Right Control - Next/Finish */}
          <button
            {...primaryProps}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors"
          >
            <ChevronRight className="h-5 w-5 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RefreshCcw } from "lucide-react";

interface VersionUpdateModalProps {
  isOpen: boolean;
  onUpdate: () => void;
}

export const VersionUpdateModal: React.FC<VersionUpdateModalProps> = ({
  isOpen,
  onUpdate,
}) => {
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isOpen && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else if (isOpen && countdown === 0) {
      onUpdate();
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isOpen, countdown, onUpdate]);

  return (
    <Dialog open={isOpen}>
      <DialogContent
        className="z-[100] w-[90%] rounded-2xl md:w-full sm:max-w-md md:left-4 md:top-4 md:translate-x-0 md:translate-y-0 md:!rounded-xl border-2"
        hideCloseButton
      >
        <DialogHeader>
          <DialogTitle className="flex flex-col md:flex-row items-center justify-center md:justify-start gap-2 text-xl md:text-lg">
            <RefreshCcw className="h-6 w-6 md:h-5 md:w-5 animate-spin text-primary" />
            Update Available
          </DialogTitle>
          <DialogDescription className="pt-2 text-center md:text-left">
            A new version is available. Updating in
            <div className="my-6 md:my-4 flex items-center justify-center">
              <span className="text-5xl md:text-4xl font-black text-primary animate-pulse tracking-tight">
                {countdown}
              </span>
              <span className="ml-3 text-xl md:text-lg font-bold text-foreground/80">
                seconds
              </span>
            </div>
            <p className="text-muted-foreground/90">
              Refreshing for the latest features.
            </p>
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end space-x-2 pt-2">
          <Button onClick={onUpdate} className="w-full text-lg h-12 md:h-12 shadow-lg hover:scale-[1.02] transition-transform">
            Update Now
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogOverlay } from "@/components/ui/dialog";
import { commonSvgIcon } from "@/helpers/commonSvg";

interface EditDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (value: string) => void | Promise<void>;
  loading?: boolean;
  selectedVideo: any;
  blur?: Boolean;
}

const EditDialog: React.FC<EditDialogProps> = ({ open, onClose, onConfirm, loading = false, selectedVideo, blur = false }) => {
  const [value, setValue] = useState<string>("");
  // keep local value in sync whenever selectedVideo changes
  useEffect(() => {
    setValue(selectedVideo?.user_content ?? "");
  }, [selectedVideo]);
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogOverlay className={`${blur ? "bg-black/10" : "bg-black/40 backdrop-blur-sm"} z-[249]`} />
      <DialogContent className="sm:max-w-md bg-white dark:text-white dark:bg-gray-900 border-0 rounded-2xl p-6 shadow-xl z-[250]">
        <div className="flex flex-col space-y-4">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            Edit Title
          </h3>
          <textarea
            className="w-full min-h-[100px] p-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            placeholder="Enter your title here..."
            value={value}
            onChange={(e) => {
              if (e.target.value.startsWith(" ")) return;
              setValue(e.target.value);
            }}
            aria-label="Edit title" />

          <div className="flex w-full justify-between gap-4 pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="flex-1 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 py-2 px-4 rounded-lg transition-colors">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => onConfirm(value)}
              disabled={loading || !value.trim()}
              className="flex-1 bg-[#3cc8d7] hover:bg-[#55a6af] text-white font-medium py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors">
              {loading ? commonSvgIcon("loader") : "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditDialog;

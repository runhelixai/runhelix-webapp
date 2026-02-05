import React from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { commonSvgIcon } from "@/helpers/commonSvg";
import { Trash2 } from "lucide-react";

const DeleteDialog = ({ open, onClose, onConfirm, loading, title = "Delete Video" }: { open: boolean; onClose: () => void; onConfirm: () => void; loading?: boolean; title?: string }) => {
    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md bg-white dark:bg-gray-900 border-0 rounded-2xl p-6 shadow-xl z-[100]">
                <div className="flex flex-col items-center text-center space-y-6">
                    <div className="rounded-full bg-red-100 dark:bg-red-900/20 p-4 transition-all duration-300 transform hover:scale-110">
                        <Trash2 className="h-8 w-8 text-red-600 dark:text-red-400" />
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{title}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">This action is final. Are sure you want to continue without exporting?</p>
                    </div>
                    <div className="flex w-full justify-between gap-4 pt-2">
                        <Button variant="outline" onClick={onClose} disabled={loading} className="flex-1 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-200 py-2 px-4 rounded-lg">Cancel</Button>
                        <Button variant="destructive" onClick={onConfirm} disabled={loading} className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium transition-colors duration-200 py-2 px-4 rounded-lg flex items-center justify-center gap-2">
                            {loading ? <> {commonSvgIcon("loader")} Deleting...</> : "Delete"}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

export default DeleteDialog
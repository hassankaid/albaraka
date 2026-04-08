import { useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trophy, ArrowRight, BookOpen } from "lucide-react";
import confetti from "canvas-confetti";

interface ChapterCompletionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chapterTitle: string;
  hasNextChapter: boolean;
  onGoToNext: () => void;
  onGoToFormation: () => void;
}

export function ChapterCompletionModal({
  open,
  onOpenChange,
  chapterTitle,
  hasNextChapter,
  onGoToNext,
  onGoToFormation,
}: ChapterCompletionModalProps) {
  const firedRef = useRef(false);

  useEffect(() => {
    if (open && !firedRef.current) {
      firedRef.current = true;

      // Fire confetti from both sides
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

      confetti({ ...defaults, particleCount: 50, origin: { x: 0.2, y: 0.6 } });
      confetti({ ...defaults, particleCount: 50, origin: { x: 0.8, y: 0.6 } });

      setTimeout(() => {
        confetti({ ...defaults, particleCount: 30, origin: { x: 0.5, y: 0.4 } });
      }, 200);
    }

    if (!open) {
      firedRef.current = false;
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md text-center">
        <div className="flex flex-col items-center gap-4 py-4">
          {/* Icon */}
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center animate-in zoom-in-50 duration-500">
            <Trophy className="h-8 w-8 text-primary" />
          </div>

          {/* Text */}
          <div className="space-y-2 animate-in fade-in-0 slide-in-from-bottom-4 duration-500 delay-150">
            <h2 className="text-xl font-bold text-foreground">
              Chapitre terminé !
            </h2>
            <p className="text-sm text-muted-foreground">
              Tu as terminé <span className="font-medium text-foreground">{chapterTitle}</span>.
              Continue sur ta lancée !
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 w-full mt-2 animate-in fade-in-0 duration-500 delay-300">
            {hasNextChapter && (
              <Button onClick={onGoToNext} className="w-full gap-2">
                Chapitre suivant
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant={hasNextChapter ? "outline" : "default"}
              onClick={onGoToFormation}
              className="w-full gap-2"
            >
              <BookOpen className="h-4 w-4" />
              Retour à la formation
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

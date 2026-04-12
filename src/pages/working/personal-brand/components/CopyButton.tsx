import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  text: string;
  label?: string;
  variant?: "default" | "ghost" | "outline";
  size?: "sm" | "default" | "icon";
  className?: string;
}

export function CopyButton({ text, label = "Copier", variant = "outline", size = "sm", className }: Props) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.cssText = "position:fixed;left:-9999px;top:0;opacity:0;";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // noop
    }
  };
  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={copy}
      className={cn(
        "gap-1.5 h-7 text-xs",
        copied && "border-emerald-500/40 text-emerald-600 dark:text-emerald-400",
        className
      )}
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Copié" : label}
    </Button>
  );
}

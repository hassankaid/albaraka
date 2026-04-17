import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      position="top-right"
      richColors
      closeButton
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast pointer-events-auto border shadow-xl backdrop-blur-md " +
            "group-[.toaster]:bg-card/95 group-[.toaster]:text-foreground " +
            "group-[.toaster]:border-primary/30 " +
            "group-[.toaster]:border-l-4 group-[.toaster]:border-l-primary",
          title: "text-sm font-semibold",
          description: "group-[.toast]:text-muted-foreground text-xs",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:hover:bg-primary/90",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          closeButton:
            "group-[.toast]:bg-card group-[.toast]:border-border group-[.toast]:text-muted-foreground group-[.toast]:hover:text-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };

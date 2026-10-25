import { ChevronRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// The chevron button that opens a row's children. The table keeps the open state.
export function ExpandToggle({
  expanded,
  label,
  onToggle,
}: {
  expanded: boolean;
  label: string;
  onToggle: () => void;
}) {
  return (
    <Button variant="ghost" size="icon-sm" aria-expanded={expanded} aria-label={label} onClick={onToggle}>
      <ChevronRightIcon aria-hidden className={cn("transition-transform", expanded && "rotate-90")} />
    </Button>
  );
}

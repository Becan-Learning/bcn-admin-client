import { AlertCircleIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

// The loading and error states of the independent Account detail sections. Plain components with
// text passed in, so server components can use them. One failing section shows its own error and
// the rest of the page still renders.
export function SectionSkeleton({ label }: { label: string }) {
  return (
    <div role="status" aria-label={label}>
      <Skeleton className="h-48 w-full" />
    </div>
  );
}

export function SectionError({ title, message }: { title: string; message: string }) {
  return (
    <Alert variant="destructive" role="alert">
      <AlertCircleIcon />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}

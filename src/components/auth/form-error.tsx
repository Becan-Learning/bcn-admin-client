import { useTranslations } from "next-intl";
import { AlertCircleIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { AuthErrorKey } from "@/lib/auth/errors";

export function FormError({ errorKey }: { errorKey: AuthErrorKey | null }) {
  const t = useTranslations("Errors");
  if (!errorKey) return null;
  return (
    <Alert variant="destructive" role="alert">
      <AlertCircleIcon />
      <AlertDescription>{t(errorKey)}</AlertDescription>
    </Alert>
  );
}

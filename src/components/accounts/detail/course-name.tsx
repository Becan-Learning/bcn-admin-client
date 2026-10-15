// A Course as the Admin reads it: code and English name, the Arabic name beneath. Both carry
// `dir="auto"` because they are Catalog content.
export function CourseName({
  code,
  name,
}: {
  code: string;
  name: { ar: string; en: string };
}) {
  return (
    <div className="flex flex-col">
      <span dir="auto">
        <span className="font-medium">{code}</span> {name.en}
      </span>
      <span dir="auto" lang="ar" className="text-xs text-muted-foreground">
        {name.ar}
      </span>
    </div>
  );
}

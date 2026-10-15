// A Course as the Admin reads it: code and English name, the Arabic name beneath. The blocks stay
// LTR so both lines align left; each name is isolated in a `<bdi>` because it is Catalog content.
export function CourseName({
  code,
  name,
}: {
  code: string;
  name: { ar: string; en: string };
}) {
  return (
    <div className="flex flex-col">
      <span>
        <span className="font-medium">{code}</span> <bdi>{name.en}</bdi>
      </span>
      <span lang="ar" className="text-xs text-muted-foreground">
        <bdi>{name.ar}</bdi>
      </span>
    </div>
  );
}

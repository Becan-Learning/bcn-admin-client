// A Catalog name as the dashboard shows it: English first, the Arabic name beneath. The Arabic value
// is isolated in a `<bdi>`, so it renders right to left inside this left-to-right page without
// right-aligning the block. Shared by the Catalog pages.
export function LocalizedName({
  name,
  className,
}: {
  name: { ar: string; en: string };
  className?: string;
}) {
  return (
    <div className={className ? `flex min-w-0 flex-col ${className}` : "flex min-w-0 flex-col"}>
      <span className="break-words">{name.en}</span>
      <span lang="ar" className="text-xs font-normal text-muted-foreground break-words">
        <bdi>{name.ar}</bdi>
      </span>
    </div>
  );
}

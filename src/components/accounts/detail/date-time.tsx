import type { ReactNode } from "react";

const format = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" });

// Values for a `t.rich` message that holds `<time>{date}</time>`: the date in the viewer's own time
// zone inside a <time> element. The server renders in its zone and the browser in the viewer's, so the
// two texts may differ: suppressHydrationWarning keeps React from complaining. An unreadable date
// renders as nothing.
export function timeValues(value: Date | string): {
  date: string;
  time: (chunks: ReactNode) => ReactNode;
} {
  const date = new Date(value);
  const valid = !Number.isNaN(date.getTime());
  return {
    date: valid ? format.format(date) : "",
    time: (chunks) =>
      valid ? (
        <time dateTime={date.toISOString()} suppressHydrationWarning>
          {chunks}
        </time>
      ) : null,
  };
}

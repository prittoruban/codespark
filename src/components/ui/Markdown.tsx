import { Fragment, type ReactNode } from "react";

/** Minimal, safe markdown renderer for assistant replies (bold, italic, lists, rules). */
function inline(text: string, keyBase: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) return <strong key={keyBase + i} className="font-semibold text-ink">{p.slice(2, -2)}</strong>;
    if (p.startsWith("*") && p.endsWith("*") && p.length > 2) return <em key={keyBase + i}>{p.slice(1, -1)}</em>;
    return <Fragment key={keyBase + i}>{p}</Fragment>;
  });
}

export function Markdown({ text }: { text: string }) {
  const blocks = text.split(/\n{2,}/);
  return (
    <div className="space-y-2.5 text-[15px] leading-relaxed text-ink/90">
      {blocks.map((block, bi) => {
        const lines = block.split("\n");
        if (block.trim() === "---") return <hr key={bi} className="border-line" />;
        if (lines.every((l) => /^[-•]\s/.test(l)))
          return (
            <ul key={bi} className="space-y-1.5">
              {lines.map((l, li) => (
                <li key={li} className="flex gap-2">
                  <span className="mt-[9px] size-1.5 shrink-0 rounded-full bg-olive" aria-hidden />
                  <span>{inline(l.replace(/^[-•]\s/, ""), `${bi}-${li}-`)}</span>
                </li>
              ))}
            </ul>
          );
        if (lines.every((l) => /^\d+\.\s/.test(l)))
          return (
            <ol key={bi} className="space-y-1">
              {lines.map((l, li) => (
                <li key={li} className="flex gap-2">
                  <span className="w-5 shrink-0 font-medium text-olive">{li + 1}.</span>
                  <span>{inline(l.replace(/^\d+\.\s/, ""), `${bi}-${li}-`)}</span>
                </li>
              ))}
            </ol>
          );
        return (
          <p key={bi}>
            {lines.map((l, li) => (
              <Fragment key={li}>
                {li > 0 && <br />}
                {inline(l, `${bi}-${li}-`)}
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}

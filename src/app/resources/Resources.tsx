"use client";

import { Badge, DemoTag } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Segmented } from "@/components/ui/Field";
import { PageHeader } from "@/components/ui/PageHeader";
import { KNOWLEDGE_BASE } from "@/data/knowledge-base";
import { BookOpen, Search, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";

const TOPICS = ["all", "fertilizer", "soil", "disease", "pest", "irrigation", "seeding"] as const;

export function Resources() {
  const [q, setQ] = useState("");
  const [topic, setTopic] = useState<(typeof TOPICS)[number]>("all");
  const docs = useMemo(
    () => KNOWLEDGE_BASE.filter((d) => (topic === "all" || d.topic === topic) && `${d.title} ${d.text} ${d.source}`.toLowerCase().includes(q.toLowerCase())),
    [q, topic],
  );
  return (
    <div className="space-y-5">
      <PageHeader title="Knowledge Library" description="The agronomy corpus Krishi AI retrieves from. Every answer cites one of these passages." actions={<DemoTag label="Demo corpus · paraphrased guidance" />} />
      <Card className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
        <div className="relative md:w-96">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-muted" aria-hidden />
          <label htmlFor="lib-q" className="sr-only">Search library</label>
          <input id="lib-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search guidance…" className="h-11 w-full rounded-full border border-line bg-ivory pl-11 pr-4 text-[14.5px] focus:border-olive focus:outline-none focus:ring-4 focus:ring-olive/10" />
        </div>
        <div className="no-scrollbar max-w-full overflow-x-auto">
          <Segmented label="Topic" size="sm" value={topic} onChange={setTopic} options={TOPICS.map((t) => ({ value: t, label: t[0].toUpperCase() + t.slice(1) }))} />
        </div>
      </Card>
      <ul className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {docs.map((d) => (
          <li key={d.id}>
            <Card as="article" className="flex h-full flex-col p-5">
              <div className="flex items-center justify-between gap-2">
                <Badge tone="info">{d.topic}</Badge>
                <BookOpen className="size-[18px] text-olive" aria-hidden />
              </div>
              <h2 className="mt-3 font-display text-[17px] font-semibold text-ink">{d.title}</h2>
              <p className="text-[12.5px] font-medium text-olive">{d.source}</p>
              <p className="mt-2 flex-1 text-[14px] leading-relaxed text-ink/80">{d.text}</p>
              <ButtonLink href={`/krishi-ai?q=${encodeURIComponent(d.title)}`} size="sm" variant="secondary" className="mt-4 w-fit"><Sparkles /> Ask about this</ButtonLink>
            </Card>
          </li>
        ))}
        {docs.length === 0 && <li className="col-span-full rounded-[24px] bg-ivory p-8 text-center text-muted ring-1 ring-line">No documents match “{q}”.</li>}
      </ul>
    </div>
  );
}

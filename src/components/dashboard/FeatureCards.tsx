import { ArrowRight, Plane, ShieldCheck, Sprout, Tractor } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const FEATURES = [
  { title: "Field Scanning", sub: "Crop health & stress detection", href: "/crop-doctor", image: "/images/field-aerial.jpg", icon: Plane },
  { title: "Smart Seeding", sub: "Sowing time & variety guide", href: "/krishi-ai?q=When%20is%20the%20best%20time%20to%20sow%20wheat%3F", image: "/images/smart-seeding.jpg", icon: Sprout },
  { title: "Crop Monitoring", sub: "Pest, disease & growth tracking", href: "/farms", image: "/images/crop-rows.jpg", icon: Tractor },
  { title: "Targeted Treatment", sub: "AI-based, eco-friendly solutions", href: "/fertilizer", image: "/images/seedling-trays.jpg", icon: ShieldCheck },
];

export function FeatureCards() {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {FEATURES.map((f) => {
        const Icon = f.icon;
        return (
          <li key={f.title}>
            <Link href={f.href} className="group flex h-full flex-col overflow-hidden rounded-[22px] border border-line bg-card shadow-card transition-all hover:-translate-y-0.5 hover:shadow-float">
              <div className="relative h-[100px] sm:h-[118px]">
                <Image src={f.image} alt="" fill sizes="(min-width: 1024px) 15vw, 50vw" className="object-cover transition-transform duration-500 group-hover:scale-105" />
                <span className="absolute -bottom-5 left-4 flex size-11 items-center justify-center rounded-full border-4 border-card bg-card text-olive shadow-card">
                  <Icon className="size-[19px]" strokeWidth={1.8} aria-hidden />
                </span>
              </div>
              <div className="relative flex-1 px-4 pb-4 pr-12 pt-7">
                <div>
                  <p className="font-display text-[15px] font-semibold leading-tight text-ink 2xl:text-[16.5px]">{f.title}</p>
                  <p className="mt-1 text-[12.5px] leading-snug text-muted sm:text-[13px]">{f.sub}</p>
                </div>
                <span className="absolute bottom-4 right-3.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-olive text-white transition-colors group-hover:bg-olive-deep">
                  <ArrowRight className="size-4" aria-hidden />
                </span>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

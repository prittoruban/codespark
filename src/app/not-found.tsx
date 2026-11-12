import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export default function NotFound() {
  return (
    <Card className="mx-auto mt-10 max-w-lg p-8 text-center">
      <p className="font-display text-[44px] font-bold text-olive">404</p>
      <h1 className="font-display text-[22px] font-semibold text-ink">This field hasn&apos;t been planted yet</h1>
      <p className="mt-2 text-[15px] text-muted">The page you&apos;re looking for doesn&apos;t exist.</p>
      <ButtonLink href="/" className="mt-6">Back to Overview</ButtonLink>
    </Card>
  );
}

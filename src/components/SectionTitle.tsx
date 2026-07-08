import type { ReactNode } from "react";

export function SectionTitle({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="mb-3.5 flex items-center gap-2 text-green">
      {icon}
      <h2 className="m-0 font-[family-name:var(--font-display)] text-xl">{text}</h2>
    </div>
  );
}

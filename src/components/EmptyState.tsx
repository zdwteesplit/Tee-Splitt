import { emptyStateClass } from "@/lib/styles";

export function EmptyState({ text }: { text: string }) {
  return <div className={emptyStateClass}>{text}</div>;
}

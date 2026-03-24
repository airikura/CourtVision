import { SEVERITY_BG } from "@/lib/constants";
import type { IssueSeverity } from "@/types";

interface BadgeProps {
  severity: IssueSeverity;
}

export function SeverityBadge({ severity }: BadgeProps) {
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded text-xs font-bold text-white ${SEVERITY_BG[severity]}`}
    >
      {severity}
    </span>
  );
}

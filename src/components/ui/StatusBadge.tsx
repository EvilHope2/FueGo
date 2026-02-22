import { cn } from "@/lib/cn";

const statusColor: Record<string, string> = {
  requested: "bg-slate-100 text-slate-700",
  offered: "bg-blue-100 text-blue-700",
  accepted: "bg-indigo-100 text-indigo-700",
  arriving: "bg-amber-100 text-amber-700",
  in_progress: "bg-cyan-100 text-cyan-700",
  completed: "bg-emerald-100 text-emerald-700",
  canceled: "bg-rose-100 text-rose-700",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", statusColor[status] || "bg-slate-100 text-slate-700")}>
      {status}
    </span>
  );
}


import { RideStatus } from "@/lib/types";

const labels: Record<RideStatus, string> = {
  requested: "Solicitado",
  offered: "Ofrecido",
  accepted: "Aceptado",
  arriving: "En camino",
  in_progress: "En viaje",
  completed: "Completado",
  canceled: "Cancelado",
};

const colors: Record<RideStatus, string> = {
  requested: "bg-slate-100 text-slate-700",
  offered: "bg-indigo-100 text-indigo-700",
  accepted: "bg-emerald-100 text-emerald-700",
  arriving: "bg-amber-100 text-amber-700",
  in_progress: "bg-sky-100 text-sky-700",
  completed: "bg-teal-100 text-teal-700",
  canceled: "bg-rose-100 text-rose-700",
};

export default function RideStatusBadge({ status }: { status: RideStatus }) {
  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${colors[status]}`}>{labels[status]}</span>;
}


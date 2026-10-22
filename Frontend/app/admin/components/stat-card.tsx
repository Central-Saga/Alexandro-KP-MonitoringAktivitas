import { AdminIcon, type AdminIconName } from "./admin-icons";

const tones = {
  blue: "bg-[#edf5e9] text-[#245f3e] ring-1 ring-[#245f3e]/20",
  teal: "bg-[#edf5e9] text-[#245f3e] ring-1 ring-[#245f3e]/20",
  green: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20",
  red: "bg-rose-50 text-rose-600 ring-1 ring-rose-600/20",
  yellow: "bg-amber-50 text-amber-700 ring-1 ring-amber-600/20",
  lime: "bg-[#a8db8c]/35 text-[#245f3e] ring-1 ring-[#245f3e]/20",
};

type StatCardProps = {
  title: string;
  value: number | string;
  detail: string;
  icon: AdminIconName;
  tone: keyof typeof tones;
};

export default function StatCard({
  title,
  value,
  detail,
  icon,
  tone,
}: StatCardProps) {
  return (
    <article className="rounded-2xl border border-[#d3e5d1] bg-white p-4 sm:p-5 shadow-[0_1px_3px_rgba(23,61,43,0.05)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-[#61776a]">{title}</p>
          <p className="mt-1 text-2xl sm:text-3xl font-bold text-[#030303]">{value}</p>
        </div>
        <div className={`flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl ${tones[tone] ?? tones.teal}`}>
          <AdminIcon name={icon} className="h-5 w-5" />
        </div>
      </div>
      <p className="mt-2 text-xs text-[#61776a]">{detail}</p>
    </article>
  );
}

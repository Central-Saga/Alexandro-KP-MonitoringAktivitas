import { AdminIcon, type AdminIconName } from "./admin-icons";

const tones = {
  blue: "bg-[#EAF7FB] text-[#016273] ring-1 ring-[#016273]/20",
  teal: "bg-[#EAF7FB] text-[#016273] ring-1 ring-[#016273]/20",
  green: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20",
  red: "bg-rose-50 text-rose-600 ring-1 ring-rose-600/20",
  yellow: "bg-amber-50 text-amber-700 ring-1 ring-amber-600/20",
  lime: "bg-[#E1F25F]/35 text-[#016273] ring-1 ring-[#016273]/20",
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
    <article className="rounded-2xl border border-[#d0e6ed] bg-white p-4 sm:p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-[#5a737e]">{title}</p>
          <p className="mt-1 text-2xl sm:text-3xl font-bold text-[#030303]">{value}</p>
        </div>
        <div className={`flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl ${tones[tone] ?? tones.teal}`}>
          <AdminIcon name={icon} className="h-5 w-5" />
        </div>
      </div>
      <p className="mt-2 text-xs text-[#5a737e]">{detail}</p>
    </article>
  );
}

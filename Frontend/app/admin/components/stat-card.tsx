import { AdminIcon, type AdminIconName } from "./admin-icons";

const tones = {
  blue: "bg-blue-100 text-blue-600",
  green: "bg-green-100 text-[#43a956]",
  red: "bg-red-100 text-red-500",
  yellow: "bg-amber-100 text-amber-600",
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
    <article className="rounded-2xl border border-[#dce4ec] bg-white p-4 sm:p-5 shadow-[0_2px_5px_rgba(15,23,42,0.05)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-[#60738f]">{title}</p>
          <p className="mt-1 text-2xl sm:text-3xl font-bold text-[#172b4d]">{value}</p>
        </div>
        <div className={`flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl ${tones[tone]}`}>
          <AdminIcon name={icon} className="h-5 w-5" />
        </div>
      </div>
      <p className="mt-2 text-xs text-[#71829a]">{detail}</p>
    </article>
  );
}

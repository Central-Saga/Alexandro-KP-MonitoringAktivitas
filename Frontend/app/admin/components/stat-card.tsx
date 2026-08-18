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
    <article className="rounded-2xl border border-[#dce4ec] bg-white p-6 shadow-[0_2px_5px_rgba(15,23,42,0.05)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[15px] text-[#60738f]">{title}</p>
          <p className="mt-3 text-3xl font-bold text-[#172b4d]">{value}</p>
        </div>
        <div className={`flex h-13 w-13 items-center justify-center rounded-xl ${tones[tone]}`}>
          <AdminIcon name={icon} className="h-6 w-6" />
        </div>
      </div>
      <p className="mt-3 text-sm text-[#71829a]">{detail}</p>
    </article>
  );
}

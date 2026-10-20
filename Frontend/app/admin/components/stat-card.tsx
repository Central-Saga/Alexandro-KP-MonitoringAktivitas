import { AdminIcon, type AdminIconName } from "./admin-icons";

const tones = {
  blue: "text-[#536b70]",
  teal: "text-[#536b70]",
  green: "text-[#536b70]",
  red: "text-[#536b70]",
  yellow: "text-[#536b70]",
  lime: "text-[#536b70]",
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
    <article className="rounded-xl border border-[#e0e3dc] bg-[#fbfbf8] p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.11em] text-[#737d79]">{title}</p>
          <p className="mt-2 text-[30px] font-semibold leading-none tracking-[-0.04em] text-[#20292a]">{value}</p>
        </div>
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#eef1ec] ${tones[tone] ?? tones.teal}`}>
          <AdminIcon name={icon} className="h-[17px] w-[17px]" />
        </div>
      </div>
      <p className="mt-3 border-t border-[#eceee9] pt-2.5 text-xs text-[#737d79]">{detail}</p>
    </article>
  );
}

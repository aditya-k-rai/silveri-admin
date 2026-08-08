import { ReactNode } from 'react';

interface StatCardProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  trend?: string;
}

export default function StatCard({ icon, label, value, trend }: StatCardProps) {
  return (
    <div className="bg-[#242424] rounded-xl p-5 border border-[#333]">
      <div className="flex items-center justify-between mb-3">
        <span className="text-gold">{icon}</span>
        {trend && (
          <span className={`text-xs px-2 py-0.5 rounded ${trend.startsWith('+') ? 'bg-green-900/40 text-green-400' : 'bg-red-900/40 text-red-400'}`}>
            {trend}
          </span>
        )}
      </div>
      <p className="text-2xl font-semibold text-white">{value}</p>
      <p className="text-sm text-[#888] mt-1">{label}</p>
    </div>
  );
}


import React from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  colorClass: string;
  trend?: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon, colorClass, trend }) => {
  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex items-center gap-4 transition-all hover:shadow-md duration-300">
      <div className={`p-3 rounded-xl ${colorClass}`}>
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</p>
        <h3 className="text-2xl font-bold text-slate-800 dark:text-white">{value}</h3>
        {trend && <p className="text-xs mt-1 font-medium text-emerald-600 dark:text-emerald-400">{trend}</p>}
      </div>
    </div>
  );
};

export default StatCard;

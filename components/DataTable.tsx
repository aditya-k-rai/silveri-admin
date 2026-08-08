'use client';

import { useState, ReactNode } from 'react';
import { Search } from 'lucide-react';

interface Column {
  key: string;
  label: string;
  render?: (value: unknown, row: Record<string, unknown>) => ReactNode;
}

interface DataTableProps {
  columns: Column[];
  data: Record<string, unknown>[];
  searchPlaceholder?: string;
}

export default function DataTable({ columns, data, searchPlaceholder = 'Search...' }: DataTableProps) {
  const [search, setSearch] = useState('');

  const filteredData = data.filter((row) =>
    Object.values(row).some((val) =>
      String(val).toLowerCase().includes(search.toLowerCase())
    )
  );

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#666]" />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#242424] border border-[#333] rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-[#666] outline-none focus:border-gold"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#333]">
              {columns.map((col) => (
                <th key={col.key} className="text-left py-3 px-4 text-[#888] font-medium text-xs uppercase tracking-wider">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredData.map((row, i) => (
              <tr key={i} className="border-b border-[#2a2a2a] hover:bg-[#242424] transition-colors">
                {columns.map((col) => (
                  <td key={col.key} className="py-3 px-4 text-[#ccc]">
                    {col.render ? col.render(row[col.key], row) : String(row[col.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
            {filteredData.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="py-8 text-center text-[#666]">
                  No results found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

'use client'; // Required for interactivity in Next.js 16

interface TableColumn<T> {
    header: string
    accessor: (item: T) => React.ReactNode
    className?: string
}

interface AdminTableProps<T> {
    data: T[]
    columns: TableColumn<T>[]
    onRowClick?: (item: T) => void
    emptyMessage?: string
}

export default function AdminTable<T extends { id: string | number }>({
    data,
    columns,
    onRowClick,
    emptyMessage = "No data available"
}: AdminTableProps<T>) {
    if (data.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-white/20 space-y-4 bg-white/[0.02] border border-white/5 rounded-[2rem]">
                <p className="text-xs font-black uppercase tracking-[0.2em]">{emptyMessage}</p>
            </div>
        )
    }

    return (
        <div className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] overflow-hidden">
            {/* Header */}
            <div className="flex items-center px-8 py-4 bg-white/[0.03] border-b border-white/5">
                {columns.map((col, index) => (
                    <div key={index} className={`text-[9px] font-black text-white/20 uppercase tracking-[0.2em] ${col.className || 'flex-1'}`}>
                        {col.header}
                    </div>
                ))}
            </div>

            {/* Rows */}
            <div className="divide-y divide-white/5">
                {data.map((item) => (
                    <div
                        key={item.id}
                        onClick={() => onRowClick?.(item)}
                        className={`flex items-center px-8 py-4 hover:bg-white/[0.03] transition-all ${onRowClick ? 'cursor-pointer group' : ''}`}
                    >
                        {columns.map((col, index) => (
                            <div key={index} className={`text-sm text-white/80 ${col.className || 'flex-1'} ${onRowClick ? 'group-hover:text-white' : ''}`}>
                                {col.accessor(item)}
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    )
}

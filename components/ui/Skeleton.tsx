import React from 'react';

interface SkeletonProps {
    className?: string;
    width?: string;
    height?: string;
    rounded?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

const roundedMap = {
    sm: 'rounded',
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    full: 'rounded-full',
};

export const Skeleton: React.FC<SkeletonProps> = ({
    className = '',
    width,
    height = 'h-4',
    rounded = 'md',
}) => (
    <div
        className={`animate-pulse bg-slate-200 dark:bg-slate-700/50 ${roundedMap[rounded]} ${height} ${width ?? 'w-full'} ${className}`.trim()}
    />
);

export const SkeletonRow: React.FC<{ columns?: number }> = ({ columns = 4 }) => (
    <tr className="border-b border-slate-200 dark:border-slate-700">
        {Array.from({ length: columns }).map((_, i) => (
            <td key={i} className="py-4 px-4">
                <Skeleton height="h-4" />
            </td>
        ))}
    </tr>
);

export const SkeletonCard: React.FC = () => (
    <div className="bg-white dark:bg-[#1a1d21] p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
        <div className="flex justify-between items-start">
            <Skeleton width="w-32" height="h-5" />
            <Skeleton width="w-16" height="h-4" />
        </div>
        <Skeleton width="w-48" height="h-4" />
        <Skeleton width="w-40" height="h-4" />
        <Skeleton width="w-56" height="h-4" />
    </div>
);

export default Skeleton;

import React from 'react';

interface IconProps {
    name: string;
    filled?: boolean;
    className?: string;
    size?: number;
    title?: string;
    onClick?: React.MouseEventHandler<HTMLSpanElement>;
}

const Icon: React.FC<IconProps> = ({ name, filled, className = '', size, title, onClick }) => {
    const style = size ? { fontSize: `${size}px` } : undefined;
    return (
        <span
            className={`${filled ? 'material-symbols-filled' : 'material-symbols-outlined'} ${className}`.trim()}
            style={style}
            title={title}
            onClick={onClick}
            aria-hidden={title ? undefined : true}
        >
            {name}
        </span>
    );
};

export default Icon;

type Props = { values: number[]; width?: number; height?: number; up?: boolean };

export function Sparkline({ values, width = 120, height = 36, up }: Props) {
    if (!values || values.length === 0) {
        return <svg width={width} height={height} />;
    }
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const stepX = width / (values.length - 1 || 1);

    const points = values
        .map((v, i) => {
            const x = i * stepX;
            const y = height - ((v - min) / range) * height;
            return `${x.toFixed(2)},${y.toFixed(2)}`;
        })
        .join(' ');

    const trendUp = up ?? values[values.length - 1] >= values[0];
    const color = trendUp ? '#10b981' : '#ef4444';

    return (
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
            <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" />
        </svg>
    );
}

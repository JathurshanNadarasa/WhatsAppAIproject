import type { Temperature } from "../../lib/types";

const STYLE: Record<Temperature, { rail: string; badge: string; bar: string; label: string }> = {
    hot: { rail: "bg-hot", badge: "bg-hot-soft text-hot", bar: "bg-hot", label: "Hot" },
    warm: { rail: "bg-warm", badge: "bg-warm-soft text-warm", bar: "bg-warm", label: "Warm" },
    cold: { rail: "bg-cold", badge: "bg-cold-soft text-cold", bar: "bg-cold", label: "Cold" },
};

// Coloured strip on the left edge of a row
export function HeatRail({ temperature }: { temperature: Temperature | null | undefined }) {
    if (!temperature) return null;
    return <span aria-hidden className={`absolute inset-y-0 left-0 w-1 ${STYLE[temperature].rail}`} />;
}

export function HeatBadge({ temperature }: { temperature: Temperature | null | undefined }) {
    if (!temperature) return null;
    const s = STYLE[temperature];
    return (
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${s.badge}`}>
            {s.label}
        </span>
    );
}

export function ScoreBar({ score, temperature }: { score: number; temperature: Temperature }) {
    return (
        <span className="flex items-center gap-2" title={`Lead score ${score} of 100`}>
            <span className="h-1.5 w-16 overflow-hidden rounded-full bg-line">
                <span className={`block h-full ${STYLE[temperature].bar}`} style={{ width: `${score}%` }} />
            </span>
            <span className="w-7 text-right text-sm font-semibold">{score}</span>
        </span>
    );
}

import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Line, Path, Text as SvgText } from "react-native-svg";
import { colors, spacing } from "@/lib/theme";

export type ChartPoint = { label: string; value: number };

type Props = {
  points: ChartPoint[];
  unit?: string;
  height?: number;
};

const PAD = { top: 16, right: 16, bottom: 28, left: 40 };

export function LineChart({ points, unit = "", height = 200 }: Props) {
  const [width, setWidth] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);

  if (points.length === 0) {
    return (
      <View style={[styles.empty, { height }]}>
        <Text style={styles.emptyText}>
          완료한 기록이 쌓이면 그래프가 그려져요.
        </Text>
      </View>
    );
  }

  const plotW = Math.max(0, width - PAD.left - PAD.right);
  const plotH = height - PAD.top - PAD.bottom;
  const values = points.map((p) => p.value);
  const rawMax = Math.max(...values);
  const rawMin = Math.min(...values);
  const span = rawMax - rawMin || Math.max(rawMax, 1);
  const max = rawMax + span * 0.15;
  const min = Math.max(0, rawMin - span * 0.15);

  const x = (i: number) =>
    PAD.left +
    (points.length === 1 ? plotW / 2 : (i / (points.length - 1)) * plotW);
  const y = (v: number) => PAD.top + (1 - (v - min) / (max - min || 1)) * plotH;

  const path = points
    .map(
      (p, i) =>
        `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`,
    )
    .join(" ");
  const gridValues = [min, (min + max) / 2, max];
  const sel = selected !== null ? points[selected] : null;

  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={{ height }}
    >
      {width > 0 && (
        <>
          <Svg width={width} height={height}>
            {gridValues.map((g, i) => (
              <Line
                key={i}
                x1={PAD.left}
                x2={width - PAD.right}
                y1={y(g)}
                y2={y(g)}
                stroke={colors.border}
                strokeWidth={1}
              />
            ))}
            {gridValues.map((g, i) => (
              <SvgText
                key={`l${i}`}
                x={PAD.left - 6}
                y={y(g) + 4}
                fill={colors.textDim}
                fontSize={11}
                textAnchor="end"
              >
                {Math.round(g)}
              </SvgText>
            ))}
            <SvgText
              x={x(0)}
              y={height - 8}
              fill={colors.textDim}
              fontSize={11}
              textAnchor="start"
            >
              {points[0].label}
            </SvgText>
            {points.length > 1 && (
              <SvgText
                x={x(points.length - 1)}
                y={height - 8}
                fill={colors.textDim}
                fontSize={11}
                textAnchor="end"
              >
                {points[points.length - 1].label}
              </SvgText>
            )}
            <Path
              d={path}
              stroke={colors.accent}
              strokeWidth={2}
              fill="none"
              strokeLinejoin="round"
            />
            {points.map((p, i) => (
              <Circle
                key={i}
                cx={x(i)}
                cy={y(p.value)}
                r={selected === i ? 6 : 4}
                fill={colors.accent}
                stroke={colors.surface}
                strokeWidth={2}
              />
            ))}
            {sel && selected !== null && (
              <Line
                x1={x(selected)}
                x2={x(selected)}
                y1={PAD.top}
                y2={height - PAD.bottom}
                stroke={colors.textDim}
                strokeWidth={1}
                strokeDasharray="3 3"
              />
            )}
          </Svg>

          <View style={[StyleSheet.absoluteFill, { pointerEvents: 'box-none' }]}>
            {points.map((_, i) => {
              const hitW =
                points.length === 1 ? plotW : plotW / (points.length - 1);
              return (
                <Pressable
                  key={i}
                  onPress={() => setSelected((cur) => (cur === i ? null : i))}
                  style={{
                    position: "absolute",
                    left: x(i) - hitW / 2,
                    width: hitW,
                    top: PAD.top,
                    height: plotH,
                  }}
                />
              );
            })}
          </View>

          {sel && selected !== null && (
            <View
              style={[
                { pointerEvents: "none" as const },
                styles.tooltip,
                { left: Math.min(Math.max(x(selected) - 50, 0), width - 100) },
              ]}
            >
              <Text style={styles.tooltipLabel}>{sel.label}</Text>
              <Text style={styles.tooltipValue}>
                {sel.value}
                {unit}
              </Text>
            </View>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: "center", justifyContent: "center" },
  emptyText: { color: colors.textDim },
  tooltip: {
    position: "absolute",
    top: 0,
    width: 100,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 8,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    alignItems: "center",
  },
  tooltipLabel: { color: colors.textDim, fontSize: 13 },
  tooltipValue: { color: colors.text, fontWeight: "700" },
});

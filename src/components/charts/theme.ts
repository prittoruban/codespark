/** Shared chart styling — olive / forest / harvest-green tones, subtle grid. */
export const CHART = {
  olive: "#687D0B",
  forest: "#344B16",
  deep: "#425500",
  sage: "#98B543",
  sageLight: "#C9DA8A",
  amber: "#E9A52A",
  grid: "#EFE6D8",
  axis: "#81796D",
  ramp: ["#D9E5A6", "#C9DA8A", "#B2CB66", "#98B543", "#7E9F29", "#5F7D14", "#3F5A0B"],
};

export const axisProps = {
  tick: { fill: CHART.axis, fontSize: 12 },
  axisLine: false,
  tickLine: false,
} as const;

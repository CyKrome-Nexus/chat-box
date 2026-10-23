import GestureSlider from "@/src/components/common/GestureSlider";
import Colors from "@/src/constants/Colors";
import { DISPLAY_SCALE_MAX, DISPLAY_SCALE_MIN } from "@/src/lib/display/useDisplayScale";

const SCALE_STEPS = 1000;

/** A thin wrapper around the generic GestureSlider, mapping its integer
 * 0..SCALE_STEPS range onto the 0.8–1.65 display-scale float range. */
const DisplayScaleSlider = ({ value, onChange, color }: { value: number; onChange: (value: number) => void; color?: string }) => {
	const toSteps = (v: number) => ((v - DISPLAY_SCALE_MIN) / (DISPLAY_SCALE_MAX - DISPLAY_SCALE_MIN)) * SCALE_STEPS;
	const fromSteps = (steps: number) => DISPLAY_SCALE_MIN + (steps / SCALE_STEPS) * (DISPLAY_SCALE_MAX - DISPLAY_SCALE_MIN);

	return (
		<GestureSlider
			min={0}
			max={SCALE_STEPS}
			value={toSteps(value)}
			onChange={(steps) => onChange(Math.round(fromSteps(steps) * 100) / 100)}
			color={color || Colors.focused}
		/>
	);
};

export default DisplayScaleSlider;

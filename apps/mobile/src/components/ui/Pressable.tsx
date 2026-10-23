import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";

import { hapticLightTap } from "@/src/lib/haptics/haptics";
import { springs } from "./tokens";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface IScalePressableProps extends Omit<PressableProps, "style"> {
	style?: StyleProp<ViewStyle>;
	scaleTo?: number;
	haptic?: boolean;
}

// Springs down on press-in and back on release; the shared tactile feel for every tappable surface.
export const ScalePressable = ({ style, scaleTo = 0.96, haptic = false, onPressIn, onPressOut, onPress, disabled, ...props }: IScalePressableProps) => {
	const scale = useSharedValue(1);
	const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

	return (
		<AnimatedPressable
			{...props}
			disabled={disabled}
			accessibilityRole={props.accessibilityRole ?? "button"}
			onPressIn={(event) => {
				scale.value = withSpring(scaleTo, springs.press);
				onPressIn?.(event);
			}}
			onPressOut={(event) => {
				scale.value = withSpring(1, springs.press);
				onPressOut?.(event);
			}}
			onPress={(event) => {
				if (haptic) hapticLightTap();
				onPress?.(event);
			}}
			style={[style, animatedStyle, disabled ? { opacity: 0.5 } : null]}
		/>
	);
};

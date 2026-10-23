import { StyleSheet, View } from "react-native";
import { useDispatch } from "react-redux";
import { Alert } from "react-native";

import IconSVG from "@/src/components/images/IconSVG";
import { ScalePressable } from "@/src/components/ui";
import { apple, facebook, google } from "@/src/constants/svgs/logos";
import { useSocialAuth } from "@/src/hooks/useSocialAuth";
import { socialSignIn } from "@/src/lib/auth/authService";
import { updateUser } from "@/src/redux/features/userSlice";

// Facebook / Google / Apple circles; light variant sits on the dark onboarding screen.
export const SocialButtons = ({ tone = "light" }: { tone?: "light" | "dark" }) => {
	const dispatch = useDispatch();
	const { signInWithFacebook, signInWithGoogle, signInWithApple } = useSocialAuth((credential) => {
		socialSignIn(credential)
			.then((user) => dispatch(updateUser(user)))
			.catch((error: Error) => Alert.alert("Sign-in failed", error.message));
	});

	const border = tone === "light" ? "rgba(255,255,255,0.6)" : "#000E08";
	const providers = [
		{ key: "facebook", svg: facebook, label: "Continue with Facebook", onPress: signInWithFacebook },
		{ key: "google", svg: google, label: "Continue with Google", onPress: signInWithGoogle },
		{ key: "apple", svg: tone === "light" ? apple : (apple.dark ?? apple), label: "Continue with Apple", onPress: () => void signInWithApple() },
	];

	return (
		<View style={styles.row}>
			{providers.map((provider) => (
				<ScalePressable key={provider.key} accessibilityLabel={provider.label} haptic scaleTo={0.9} onPress={provider.onPress} style={[styles.circle, { borderColor: border }]}>
					<IconSVG svg={provider.svg} includeBorder={false} width={24} height={24} />
				</ScalePressable>
			))}
		</View>
	);
};

const styles = StyleSheet.create({
	row: { flexDirection: "row", justifyContent: "center", gap: 20 },
	circle: { width: 48, height: 48, borderRadius: 24, borderWidth: 1, alignItems: "center", justifyContent: "center" },
});

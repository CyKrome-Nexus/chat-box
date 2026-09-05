import {
	ImageBackground,
	StyleSheet,
	TouchableOpacity,
	Text,
	View,
} from "react-native";
import { router } from "expo-router";
import { useDispatch } from "react-redux";

import BBar from "@/src/components/buttons/BBar";
import { apple, facebook, google } from "@/src/constants/svgs/logos";
import CarmeText from "@/src/components/Themed/CarmeText";
import OR from "@/src/components/decorators/OR";
import BContainer from "@/src/components/buttons/BContainer";
import { useSocialAuth } from "@/src/hooks/useSocialAuth";
import { ISocialProfile } from "@/src/lib/auth/socialAuth";
import { upsertSocialUser } from "@/src/lib/auth/authService";
import { updateUser } from "@/src/redux/features/userSlice";

const SOCIAL_PROVIDERS: ISocialProfile["provider"][] = ["facebook", "google", "apple"];

export default function Page() {
	const dispatch = useDispatch();

	const handleSocialSuccess = async (profile: ISocialProfile) => {
		const stored = await upsertSocialUser(profile);
		dispatch(
			updateUser({
				name: stored.name,
				username: stored.identifier,
				avatar: stored.avatarUrl ? { url: stored.avatarUrl } : undefined,
			})
		);
	};

	const { signInWithGoogle, signInWithFacebook, signInWithApple } = useSocialAuth(handleSocialSuccess);

	const handleSocialPress = (index: number) => {
		const provider = SOCIAL_PROVIDERS[index];
		if (provider === "facebook") signInWithFacebook();
		if (provider === "google") signInWithGoogle();
		if (provider === "apple") signInWithApple();
	};

	return (
		<ImageBackground
			source={require("@/assets/images/BackgroundEllipse.png")}
			resizeMethod="resize"
			alt="Ellipse"
			style={styles.container}
		>
			<View style={styles.upperArea} />
			<View style={styles.main}>
				<BContainer svgs={[facebook, google, apple]} onPressAt={handleSocialPress} />

				<OR />

				<BBar
					onPress={() =>
						router.push({
							pathname: "auth",
							params: {
								authType: "signup",
							},
						})
					}
				>
					<CarmeText
						style={{ textAlign: "center", fontSize: 22, fontWeight: "500" }}
					>
						Sign up with Phone
					</CarmeText>
				</BBar>

				<View
					style={{
						gap: 2,
						flexDirection: "row",
						padding: 30,
						alignItems: "center",
						justifyContent: "center",
					}}
				>
					<Text style={{ color: "#B4BCB9", fontWeight: "300" }}>
						Existing account?
					</Text>
					<TouchableOpacity
						onPress={() =>
							router.push({
								pathname: "auth",
								params: {
									authType: "login",
								},
							})
						}
					>
						<Text style={{ color: "white", fontWeight: "bold" }}>
							&nbsp;Log in
						</Text>
					</TouchableOpacity>
				</View>
			</View>
		</ImageBackground>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		alignItems: "center",
		padding: 24,
		backgroundColor: "black",
	},
	upperArea: {
		flex: 0.7,
	},
	main: {
		flex: 0.3,
		justifyContent: "center",
		alignItems: "center",
		maxWidth: 960,
		marginHorizontal: "auto",
		width: "100%",
	},
});

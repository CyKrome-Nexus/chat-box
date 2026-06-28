import { useEffect, useState } from "react";
import {
	Text,
	View,
	StyleSheet,
	TouchableOpacity,
	KeyboardAvoidingView,
	Platform,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { router, useLocalSearchParams } from "expo-router";
import { ScrollView } from "react-native-gesture-handler";

import BContainer from "@/src/components/buttons/BContainer";
import OR from "@/src/components/decorators/OR";
import { apple, facebook, google } from "@/src/constants/svgs/logos";
import TextInput from "@/src/components/inputs/TextInput";
import Colors from "@/src/constants/Colors";
import { updateUser } from "@/src/redux/features/userSlice";
import { IUser } from "../../interfaces/user-interface";

const Authentication = () => {
	const dispatch = useDispatch();
	const user = useSelector((state: { user: IUser }) => state.user);

	useEffect(() => {
		if (user?.username)
			router.replace({
				pathname: "(tabs)/messages",
			});
	}, [user]);

	const params = useLocalSearchParams();
	const [authType, setAuthType] = useState(params?.authType);

	const [email, setEmail] = useState("");
	const [name, setName] = useState("");
	const [phone, setPhone] = useState("");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");

	useEffect(() => {
		setAuthType((_prev) => params?.authType);
	}, [params?.authType]);

	const onPressLogin = () => {
		if (email === "meri.kittu" && password === "iloveyou") {
			dispatch(
				updateUser({
					name: "Hafizun Meri Jaan",
					username: email,
					avatar: {
						url: "https://media-maa3-1.cdn.whatsapp.net/v/t61.24694-24/567675247_841743381745937_7315550492190494280_n.jpg?stp=dst-jpg_s96x96_tt6&ccb=11-4&oh=01_Q5Aa2wGuU9zO8NM8s0iPPEQv0C4QiEJNbiFw8wMW0E4XtQQ2Wg&oe=6901C5DD&_nc_sid=5e03e0&_nc_cat=109",
					},
					about: "Sorry Sorry Sorry I love you ❤️",
				})
			);
		}
	};

	return (
		<KeyboardAvoidingView
			behavior={Platform.OS === "ios" ? "padding" : "height"}
			style={{ flex: 1 }}
		>
			<View style={styles.container}>
				<ScrollView
					contentContainerStyle={styles.scrollContent}
					keyboardShouldPersistTaps="handled"
					showsVerticalScrollIndicator={false}
				>
					<View style={styles.main}>
						{authType === "login" ? (
							<>
								<View style={styles.headerRow}>
									<View style={styles.headerHighlightContainer}>
										<View style={styles.headerUnderline} />
										<Text style={styles.headerText}>Log in&nbsp;</Text>
									</View>
									<Text style={styles.headerText}>to Chatbox</Text>
								</View>
								<Text style={styles.welcomeText}>
									Welcome back! Sign in using your social account or email to
									continue using
								</Text>
								<BContainer
									svgs={[facebook, google, apple.dark]}
									borderColor={"black"}
								/>
								<OR barColor="#E6E8E7" />
								<View style={styles.inputsWrapper}>
									<TextInput
										value={email}
										onChange={setEmail}
										label="Your email"
										labelColor={Colors.focused}
									/>
									<TextInput
										value={password}
										onChange={setPassword}
										label="Password"
										isPassword={true}
									/>
								</View>
							</>
						) : (
							<>
								<View style={styles.headerRow}>
									<Text style={styles.headerText}>Sign up with&nbsp;</Text>
									<View style={styles.headerHighlightContainer}>
										<View style={styles.headerUnderline} />
										<Text style={styles.headerText}>Phone&nbsp;</Text>
									</View>
								</View>
								<Text style={styles.welcomeText}>
									Get chatting with friends and family today by signing up for
									our chat app!
								</Text>
								<View style={styles.inputsWrapper}>
									<TextInput
										value={name}
										onChange={setName}
										label="Full Name"
										labelColor={Colors.focused}
									/>
									<TextInput
										value={phone}
										onChange={setPhone}
										label="Your Phone"
										labelColor={Colors.focused}
									/>
									<TextInput
										value={password}
										onChange={setPassword}
										label="Password"
										isPassword={true}
									/>
									<TextInput
										value={confirmPassword}
										onChange={setConfirmPassword}
										label="Confirm Password"
										isPassword={true}
									/>
								</View>
							</>
						)}
					</View>
				</ScrollView>
				{/* BOTTOM ACTIONS */}
				<View style={styles.bottomContainer}>
					<TouchableOpacity style={styles.loginButton} onPress={onPressLogin}>
						<Text style={styles.loginText}>
							{authType === "login" ? "Log in" : "Sign up"}
						</Text>
					</TouchableOpacity>
					{authType === "login" && (
						<TouchableOpacity>
							<Text style={{ color: Colors.focused }}>Forgot password?</Text>
						</TouchableOpacity>
					)}
					<View style={{ flexDirection: "row", marginTop: 4 }}>
						{authType === "login" ? (
							<>
								<Text>Don't have an account?&nbsp;</Text>
								<TouchableOpacity onPress={() => setAuthType("signup")}>
									<Text style={{ color: Colors.focused, fontWeight: "bold" }}>
										Sign up
									</Text>
								</TouchableOpacity>
								<Text>&nbsp;instead.</Text>
							</>
						) : (
							<>
								<Text>Already have an account? </Text>
								<TouchableOpacity onPress={() => setAuthType("login")}>
									<Text style={{ color: Colors.focused, fontWeight: "bold" }}>
										Login
									</Text>
								</TouchableOpacity>
								<Text>&nbsp;instead.</Text>
							</>
						)}
					</View>
				</View>
			</View>
		</KeyboardAvoidingView>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	scrollContent: {
		flexGrow: 1,
		justifyContent: "flex-start",
	},
	main: {
		padding: 24,
		alignItems: "center",
		justifyContent: "center",
		width: "100%",
		height: "100%",
	},
	headerRow: {
		flexDirection: "row",
		alignItems: "flex-end",
		marginBottom: 24,
		position: "relative",
	},
	headerHighlightContainer: {
		position: "relative",
	},
	headerUnderline: {
		position: "absolute",
		left: 0,
		right: 0,
		top: 20,
		height: 10,
		backgroundColor: "#58C3B6",
		zIndex: -1,
	},
	headerText: {
		fontFamily: "Inter 18pt Bold",
		fontWeight: "bold",
		fontSize: 24,
		color: "black",
	},
	welcomeText: {
		color: "#797C7B",
		width: "80%",
		textAlign: "center",
		lineHeight: 20,
		fontWeight: "400",
		marginBottom: 40,
	},
	inputsWrapper: {
		width: "100%",
		gap: 14,
		marginBottom: 16,
	},
	bottomContainer: {
		width: "100%",
		justifyContent: "center",
		alignItems: "center",
		gap: 14,
		paddingBottom: 30,
		paddingTop: 10,
	},
	loginButton: {
		backgroundColor: "#e8e8e8ff",
		width: "90%",
		padding: 15,
		borderRadius: 20,
	},
	loginText: {
		fontSize: 20,
		fontFamily: "Inter 18pt Bold",
		fontWeight: "bold",
		color: "gray",
		textAlign: "center",
	},
});

export default Authentication;

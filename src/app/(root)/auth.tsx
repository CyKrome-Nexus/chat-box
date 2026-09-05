import { useEffect, useMemo, useState } from "react";
import {
	Text,
	View,
	StyleSheet,
	TouchableOpacity,
	KeyboardAvoidingView,
	Platform,
	ActivityIndicator,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { router, useLocalSearchParams } from "expo-router";
import { ScrollView } from "react-native-gesture-handler";

import BContainer from "@/src/components/buttons/BContainer";
import OR from "@/src/components/decorators/OR";
import { apple, facebook, google } from "@/src/constants/svgs/logos";
import TextInput from "@/src/components/inputs/TextInput";
import CountryCodePicker, { COUNTRY_CODES, ICountryCode } from "@/src/components/inputs/CountryCodePicker";
import Colors from "@/src/constants/Colors";
import { updateUser } from "@/src/redux/features/userSlice";
import { AuthError, login, signUp } from "@/src/lib/auth/authService";
import { isEmailOrPhone, isPhone, isStrongPassword, passwordsMatch } from "@/src/lib/auth/validators";
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

	const [identifier, setIdentifier] = useState("");
	const [name, setName] = useState("");
	const [phone, setPhone] = useState("");
	const [countryCode, setCountryCode] = useState<ICountryCode>(COUNTRY_CODES[0]);
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");

	const [submitError, setSubmitError] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);

	useEffect(() => {
		setAuthType((_prev) => params?.authType);
	}, [params?.authType]);

	const errors = useMemo(() => {
		if (authType === "login") {
			return {
				identifier: identifier && !isEmailOrPhone(identifier) ? "Enter a valid email or phone number" : "",
				password: password && password.length === 0 ? "Password is required" : "",
			};
		}

		return {
			name: name && name.trim().length < 2 ? "Enter your full name" : "",
			phone: phone && !isPhone(phone) ? "Enter a valid phone number" : "",
			password: password && !isStrongPassword(password)
				? "At least 8 characters, with a letter and a number"
				: "",
			confirmPassword:
				confirmPassword && !passwordsMatch(password, confirmPassword)
					? "Passwords do not match"
					: "",
		};
	}, [authType, identifier, password, name, phone, confirmPassword]);

	const isFormValid = useMemo(() => {
		if (authType === "login") {
			return isEmailOrPhone(identifier) && password.length > 0;
		}
		return (
			name.trim().length >= 2 &&
			isPhone(phone) &&
			isStrongPassword(password) &&
			passwordsMatch(password, confirmPassword)
		);
	}, [authType, identifier, password, name, phone, confirmPassword]);

		const onPressSubmit = async () => {
		setSubmitError("");
		if (!isFormValid || isSubmitting) return;

		setIsSubmitting(true);
		try {
			if (authType === "login") {
				const stored = await login({ identifier, password });
				dispatch(
					updateUser({
						name: stored.name,
						username: stored.identifier,
						avatar: stored.avatarUrl ? { url: stored.avatarUrl } : undefined,
						about: stored.about,
					})
				);
			} else {
				const fullPhone = `${countryCode.code}${phone.trim()}`;
				const stored = await signUp({ name: name.trim(), identifier: fullPhone, password });
				dispatch(
					updateUser({
						name: stored.name,
						username: stored.identifier,
					})
				);
			}
		} catch (e) {
			setSubmitError(e instanceof AuthError ? e.message : "Something went wrong. Please try again.");
		} finally {
			setIsSubmitting(false);
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
									svgs={[facebook, google, apple.dark ?? apple.default]}
									borderColor={"black"}
								/>
								<OR barColor="#E6E8E7" />
								<View style={styles.inputsWrapper}>
									<TextInput
										value={identifier}
										onChange={setIdentifier}
										label="Email or phone number"
										labelColor={Colors.focused}
										error={errors.identifier}
									/>
									<TextInput
										value={password}
										onChange={setPassword}
										label="Password"
										isPassword={true}
										error={errors.password}
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
										error={errors.name}
									/>
									<TextInput
										value={phone}
										onChange={setPhone}
										label="Your Phone"
										labelColor={Colors.focused}
										keyboardType="phone-pad"
										error={errors.phone}
										leftAccessory={
											<CountryCodePicker value={countryCode} onChange={setCountryCode} />
										}
									/>
									<TextInput
										value={password}
										onChange={setPassword}
										label="Password"
										isPassword={true}
										error={errors.password}
									/>
									<TextInput
										value={confirmPassword}
										onChange={setConfirmPassword}
										label="Confirm Password"
										isPassword={true}
										error={errors.confirmPassword}
									/>
								</View>
							</>
						)}
						{!!submitError && <Text style={styles.submitError}>{submitError}</Text>}
					</View>
				</ScrollView>
				{/* BOTTOM ACTIONS */}
				<View style={styles.bottomContainer}>
					<TouchableOpacity
						style={[styles.loginButton, isFormValid && styles.loginButtonActive]}
						disabled={!isFormValid || isSubmitting}
						onPress={onPressSubmit}
					>
						{isSubmitting ? (
							<ActivityIndicator color={isFormValid ? "#fff" : "gray"} />
						) : (
							<Text style={[styles.loginText, isFormValid && styles.loginTextActive]}>
								{authType === "login" ? "Log in" : "Sign up"}
							</Text>
						)}
					</TouchableOpacity>
					{authType === "login" && (
						<TouchableOpacity onPress={() => router.push("/(root)/forgot-password")}>
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
	submitError: {
		color: "#F04A4C",
		textAlign: "center",
		marginTop: 8,
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
	loginButtonActive: {
		backgroundColor: Colors.focused,
	},
	loginText: {
		fontSize: 20,
		fontFamily: "Inter 18pt Bold",
		fontWeight: "bold",
		color: "gray",
		textAlign: "center",
	},
	loginTextActive: {
		color: "#fff",
	},
});

export default Authentication;

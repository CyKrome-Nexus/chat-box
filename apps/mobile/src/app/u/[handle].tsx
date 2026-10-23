import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { AppText, PrimaryButton, palette } from "@/src/components/ui";
import { usersApi } from "@/src/lib/api/services";

// Resolves a chatbox.link/u/<handle> deep link to the user's profile.
const UserProfileLinkScreen = () => {
	const { handle = "" } = useLocalSearchParams<{ handle: string }>();
	const [missing, setMissing] = useState(false);

	useEffect(() => {
		let cancelled = false;
		usersApi
			.byHandle(handle.replace(/^@/, ""))
			.then((user) => {
				if (!cancelled) router.replace({ pathname: "/contact-info", params: { userId: user.id } });
			})
			.catch(() => !cancelled && setMissing(true));
		return () => {
			cancelled = true;
		};
	}, [handle]);

	return (
		<View style={styles.container}>
			{missing ? (
				<>
					<Ionicons name="person-remove-outline" size={48} color={palette.danger} />
					<AppText variant="heading" align="center">
						@{handle} isn't on Chatbox
					</AppText>
					<PrimaryButton title="Go back" onPress={() => router.back()} style={styles.button} />
				</>
			) : (
				<ActivityIndicator size="large" color={palette.brand} />
			)}
		</View>
	);
};

export default UserProfileLinkScreen;

const styles = StyleSheet.create({
	container: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16, padding: 32, backgroundColor: palette.white },
	button: { alignSelf: "stretch", marginTop: 16 },
});

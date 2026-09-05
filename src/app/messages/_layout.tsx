import React, { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useSelector } from "react-redux";

import IconSVG from "@/src/components/images/IconSVG";
import { backArrow, camera, phone } from "@/src/constants/svgs/icons";
import Avatar from "@/src/components/images/Avatar";
import BIcon from "@/src/components/buttons/BIcon";
import { useCallEngine } from "@/src/hooks/useCallEngine";

const MessagesLayout = () => {
	const params = useLocalSearchParams();
	const user = (() => {
		if (!params.user) return null;
		try {
			return JSON.parse(params.user as string);
		} catch {
			return null;
		}
	})();
	const currentUserId = useSelector((state: any) => state.user?._id || state.user?.username || "me");
	const { startOutgoingCall } = useCallEngine(currentUserId);

	return (
		<Stack>
			<Stack.Screen
				name="Chat"
				initialParams={{ user }}
				options={{
					title: "",
					// headerShadowVisible: false,
					// headerBackground: () => (<></>),
					headerBackVisible: false,
					headerLeft: () => {
						return (
							<>
								<TouchableOpacity
									onPress={() => {
										if (router.canGoBack()) {
											router.back();
										} else {
											router.push("/");
										}
									}}
								>
									<IconSVG
										svg={backArrow}
										includeBorder={false}
										width={18}
										height={18}
									/>
								</TouchableOpacity>
							</>
						);
					},
					headerTitle: () => {
						return (
							<>
								<View
									style={{
										alignItems: "center",
										flex: 1,
										flexDirection: "row",
										gap: 10,
										paddingLeft: 10,
									}}
								>
									<Avatar data={user?.avatar} isWhite={true} size={45} />
									<View>
										<Text style={{ fontSize: 20, fontWeight: 'bold' }}>{user?.name} </Text>
										{user?.status && <>
											<Text style={{ fontSize: 12}}>Active Now</Text>
										</>}
									</View>
									<View style={{ flex: 1 }} />
									<BIcon
										svg={phone}
										height={22}
										width={22}
										iconHeight={22}
										iconWidth={22}
										style={{ marginHorizontal: 6 }}
										onPress={() => startOutgoingCall(user, "audio")}
									/>
									<BIcon
										svg={camera}
										height={22}
										width={22}
										iconHeight={22}
										iconWidth={22}
										style={{ marginHorizontal: 6 }}
										onPress={() => startOutgoingCall(user, "video")}
									/>
								</View>
							</>
						);
					},
				}}
			/>
		</Stack>
	);
};

export default MessagesLayout;

const styles = StyleSheet.create({});

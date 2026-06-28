import { router, Tabs } from "expo-router";
import { TouchableOpacity, View } from "react-native";

import IconSVG from "@/src/components/images/IconSVG";
import Colors from "@/src/constants/Colors";
import {
	addCall,
	addContact,
	backArrow,
	contact,
	message,
	phone,
	search,
	settings,
} from "@/src/constants/svgs/icons";
import BIcon from "@/src/components/buttons/BIcon";
import Avatar from "@/src/components/images/Avatar";
import { useSelector } from "react-redux";
import { IUser } from "@/src/interfaces/user-interface";

export default function TabLayout() {
	return (
		<Tabs
			screenOptions={{
				headerTitleAlign: "center",
				headerTitleStyle: {
					color: "white",
					fontFamily: "Inter 18pt Bold",
					fontWeight: "bold",
					fontSize: 24,
				},
				headerStyle: {
					backgroundColor: "black",
				},
				headerStatusBarHeight: 60,
				headerLeft: () => (
					<View style={{ marginLeft: 30 }}>
						<BIcon
							svg={search}
							width={45}
							height={45}
							iconWidth={22}
							iconHeight={22}
						/>
					</View>
				),
				tabBarStyle: {
					paddingTop: 15,
					height: "10%",
				},
			}}
		>
			<Tabs.Screen
				name="messages"
				options={{
					title: "Home",
					tabBarIcon: ({ focused }) => (
						<IconSVG svg={message} includeBorder={false} focused={focused} />
					),
					tabBarActiveTintColor: Colors.focused,
					headerRight: () => {
						const user = useSelector((state: { user: IUser }) => state.user);
						return (
							<>
								<View style={{ marginRight: 30 }}>
									<Avatar data={user?.avatar} />
								</View>
							</>
						);
					},
				}}
			/>
			<Tabs.Screen
				name="calls"
				options={{
					title: "Calls",
					tabBarIcon: ({ focused }) => (
						<IconSVG svg={phone} includeBorder={false} focused={focused} />
					),
					tabBarActiveTintColor: Colors.focused,
					headerRight: () => (
						<>
							<View style={{ marginRight: 30 }}>
								<BIcon
									svg={addCall}
									width={45}
									height={45}
									iconWidth={22}
									iconHeight={22}
								/>
							</View>
						</>
					),
				}}
			/>
			<Tabs.Screen
				name="contacts"
				options={{
					title: "Contacts",
					tabBarIcon: ({ focused }) => (
						<IconSVG svg={contact} includeBorder={false} focused={focused} />
					),
					headerRight: () => (
						<>
							<View style={{ marginRight: 30 }}>
								<BIcon
									svg={addContact}
									width={45}
									height={45}
									iconWidth={22}
									iconHeight={22}
								/>
							</View>
						</>
					),
					tabBarActiveTintColor: Colors.focused,
				}}
			/>
			<Tabs.Screen
				name="settings"
				options={{
					title: "Settings",
					tabBarIcon: ({ focused }) => (
						<IconSVG svg={settings} includeBorder={false} focused={focused} />
					),
					tabBarActiveTintColor: Colors.focused,
					headerLeft: () => {
						return (
							<>
								<TouchableOpacity
									style={{ marginLeft: 30 }}
									onPressIn={async () => {
										function sleep(ms: number): Promise<void> {
											return new Promise((resolve) => setTimeout(resolve, ms));
										}

										await sleep(200);
										if (router.canGoBack()) {
											router.back();
										} else {
											router.push("/");
										}
									}}
								>
									<IconSVG
										svg={backArrow?.dark as string}
										height={20}
										width={20}
										includeBorder={false}
									/>
								</TouchableOpacity>
							</>
						);
					},
				}}
			/>
		</Tabs>
	);
}

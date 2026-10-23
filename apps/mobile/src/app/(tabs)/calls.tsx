import { useState } from "react";
import { RefreshControl, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { useSelector } from "react-redux";
import Animated, { FadeInDown } from "react-native-reanimated";

import CallRibbon from "@/src/components/riboons/CallRibbon";
import { AppText, CircleButton, SectionLabel, SheetScreen, palette } from "@/src/components/ui";
import { syncCallHistory } from "@/src/lib/sync/chatSync";
import type { RootState } from "@/src/redux/store/store";

const Calls = () => {
	const history = useSelector((state: RootState) => state.call.history);
	const [refreshing, setRefreshing] = useState(false);

	const refresh = async () => {
		setRefreshing(true);
		await syncCallHistory().catch(() => undefined);
		setRefreshing(false);
	};

	return (
		<SheetScreen
			title="Calls"
			left={<CircleButton icon="search-outline" label="Search" variant="outline" onPress={() => router.push("/search")} />}
			right={<CircleButton icon="call-outline" label="Start a call" variant="outline" onPress={() => router.push("/search")} />}
		>
			<Animated.FlatList
				data={history}
				keyExtractor={(item) => item.id}
				renderItem={({ item, index }) => (
					<Animated.View entering={FadeInDown.delay(Math.min(index, 10) * 30).springify().damping(22)}>
						<CallRibbon call={item} />
					</Animated.View>
				)}
				ListHeaderComponent={<SectionLabel>Recent</SectionLabel>}
				ItemSeparatorComponent={() => <View style={styles.separator} />}
				contentContainerStyle={styles.list}
				refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} tintColor={palette.brand} />}
				ListEmptyComponent={
					<View style={styles.empty}>
						<AppText variant="heading" align="center">
							No calls yet
						</AppText>
						<AppText variant="label" weight="regular" tone="muted" align="center">
							Start a voice or video call from any chat.
						</AppText>
					</View>
				}
			/>
		</SheetScreen>
	);
};

const styles = StyleSheet.create({
	list: { paddingBottom: 40 },
	separator: { height: StyleSheet.hairlineWidth, backgroundColor: palette.divider, marginLeft: 88 },
	empty: { paddingTop: 80, paddingHorizontal: 40, gap: 8 },
});

export default Calls;

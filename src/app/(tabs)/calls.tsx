import ListDrawer from "@/src/components/ListDrawer";
import CallRibbon from "@/src/components/riboons/CallRibbon";
import { ICallRibbon } from "@/src/interfaces/list-interface";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { FlatList } from "react-native-gesture-handler";
import { useDispatch, useSelector } from "react-redux";
import { clearCallHistory } from "@/src/redux/features/callSlice";

const Calls = () => {
	const dispatch = useDispatch();
	const calls = useSelector((state: any) => state.call.history as ICallRibbon[]);

	const handleClearHistory = () => {
		if (!calls.length) return;
		Alert.alert("Clear call history", "This will remove all call history entries.", [
			{ text: "Cancel", style: "cancel" },
			{ text: "Clear", style: "destructive", onPress: () => dispatch(clearCallHistory()) },
		]);
	};

	return (
		<>
			<View style={styles.container}>
				<ListDrawer>
					<View style={styles.headerRow}>
						<Text
							style={{
								fontFamily: "Inter 18pt Bold",
								fontSize: 18,
								fontWeight: "600",
							}}
						>
							Recent
						</Text>
						{calls.length > 0 && (
							<TouchableOpacity onPress={handleClearHistory}>
								<Text style={styles.clearText}>Clear</Text>
							</TouchableOpacity>
						)}
					</View>
					<FlatList
						data={calls}
						scrollEnabled
						keyExtractor={(item) => item.id}
						renderItem={({ item }) => <CallRibbon content={item} />}
						contentContainerStyle={{ paddingBottom: 180 }}
						ListEmptyComponent={() => (
							<View style={styles.emptyContainer}>
								<Text style={styles.emptyText}>No call history yet</Text>
							</View>
						)}
					/>
				</ListDrawer>
			</View>
		</>
	);
};

const styles = StyleSheet.create({
	container: {
		backgroundColor: "black",
		flex: 1,
		flexDirection: "column-reverse",
		height: "100%",
	},
	headerRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 8,
	},
	clearText: {
		color: "#F04A4C",
		fontSize: 14,
		fontWeight: "600",
	},
	emptyContainer: {
		padding: 40,
		alignItems: "center",
	},
	emptyText: {
		color: "#797C7B",
	},
});

export default Calls;

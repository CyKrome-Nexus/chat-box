import { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import Chat from "@/src/app/messages/Chat";
import { IChatRibbon } from "@/src/interfaces/list-interface";

const LIST_PANE_WIDTH = 380;

/**
 * The tablet/foldable (>= 600dp) two-pane layout: a fixed-width conversation
 * list on the left, and the actual chat thread on the right — the same
 * `Chat` component the phone layout pushes onto the stack, just rendered
 * in place instead of navigated to. Because both panes live in one component
 * tree, unfolding a foldable (which just changes `useWindowDimensions`,
 * re-evaluating `isTablet` in `useResponsiveLayout`) never remounts the list
 * or drops `selectedChat` — the exact "seamless, no reload" requirement.
 */
const MasterDetailLayout = ({
	listPane,
	selectedChat,
}: {
	listPane: ReactNode;
	selectedChat: IChatRibbon | null;
}) => (
	<View style={styles.row}>
		<View style={styles.listPane}>{listPane}</View>
		<View style={styles.divider} />
		<View style={styles.detailPane}>
			{selectedChat ? (
				<Chat embeddedUser={selectedChat} />
			) : (
				<View style={styles.placeholder}>
					<Ionicons name="chatbubbles-outline" size={56} color="#CDD1D0" />
					<Text style={styles.placeholderText}>Select a chat to start messaging</Text>
				</View>
			)}
		</View>
	</View>
);

export default MasterDetailLayout;

const styles = StyleSheet.create({
	row: {
		flex: 1,
		flexDirection: "row",
		backgroundColor: "#fff",
	},
	listPane: {
		width: LIST_PANE_WIDTH,
	},
	divider: {
		width: StyleSheet.hairlineWidth,
		backgroundColor: "#E4E9E8",
	},
	detailPane: {
		flex: 1,
	},
	placeholder: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		gap: 12,
		backgroundColor: "#FAFCFC",
	},
	placeholderText: {
		fontSize: 15,
		color: "#797C7B",
		fontWeight: "500",
	},
});

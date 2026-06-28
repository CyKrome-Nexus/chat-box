import React, { useEffect, useRef, useState } from "react";
import {
	View,
	Text,
	StyleSheet,
	Platform,
	FlatList,
	TouchableOpacity,
	TextInput,
	TouchableWithoutFeedback,
	Keyboard,
	KeyboardEvent,
} from "react-native";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import BIcon from "@/src/components/buttons/BIcon";
import { clip } from "@/src/constants/svgs/icons";

const DUMMY_MESSAGES = [
	{ id: "1", type: "sender" },
	{ id: "2", type: "receiver" },
	{ id: "3", type: "receiver" },
	{ id: "4", type: "audio" },
];

const Chat = () => {
	const [keyboardOffset, setKeyboardOffset] = useState(0);
	const flatListRef = useRef<FlatList>(null);

	useEffect(() => {
		const showEvent =
			Platform.OS === "android" ? "keyboardDidShow" : "keyboardWillShow";
		const hideEvent =
			Platform.OS === "android" ? "keyboardDidHide" : "keyboardWillHide";

		const showSub = Keyboard.addListener(showEvent, (e: KeyboardEvent) => {
			setKeyboardOffset(e.endCoordinates.height);
		});
		const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardOffset(0));

		return () => {
			showSub.remove();
			hideSub.remove();
		};
	}, []);

	const renderMessage = ({ item }: any) => (
		<View style={styles.messageBubblePlaceholder}>
			<Text
				style={styles.placeholderText}
			>{`<MessageBubble type="${item.type}" />`}</Text>
		</View>
	);

	return (
		<TouchableWithoutFeedback onPress={Keyboard.dismiss}>
			<View style={styles.container}>
				<FlatList
					ref={flatListRef}
					data={DUMMY_MESSAGES}
					renderItem={renderMessage}
					keyExtractor={(item) => item.id}
					contentContainerStyle={[
						styles.messageList,
						{ paddingBottom: 80 + keyboardOffset }, // leave space for keyboard + input
					]}
					showsVerticalScrollIndicator={false}
					keyboardShouldPersistTaps="handled"
					inverted
				/>

				<View
					style={[
						styles.inputBar,
						{
							bottom: keyboardOffset, // dynamically move up with keyboard
						},
					]}
				>
					<BIcon
						style={{ marginHorizontal: 5 }}
						svg={clip}
						height={20}
						width={20}
					/>
					<View style={styles.inputContainer}>
						<TextInput
							style={styles.textInput}
							placeholder="Type your message"
							placeholderTextColor="#797C7B"
							returnKeyType="send"
							blurOnSubmit={false}
							onFocus={() => {
								requestAnimationFrame(() => {
									flatListRef.current?.scrollToOffset({
										offset: 0,
										animated: true,
									});
								});
							}}
						/>
					</View>
					<TouchableOpacity>
						<MaterialCommunityIcons
							name="sticker-emoji"
							size={22}
							color="#818181"
						/>
					</TouchableOpacity>
					<TouchableOpacity style={styles.sendButton}>
						<Ionicons name="send" size={22} color="#fff" />
					</TouchableOpacity>
				</View>
			</View>
		</TouchableWithoutFeedback>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#fcfcfc",
	},
	messageList: {
		paddingHorizontal: 16,
		paddingTop: 16,
	},
	messageBubblePlaceholder: {
		paddingVertical: 8,
		alignItems: "center",
		opacity: 0.2,
	},
	placeholderText: {
		fontStyle: "italic",
		color: "#888",
		fontSize: 16,
	},
	inputBar: {
		position: "absolute",
		left: 0,
		right: 0,
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 10,
		paddingVertical: 10,
		backgroundColor: "#fff",
		borderTopWidth: 1,
		borderTopColor: "#eee",
	},
	inputContainer: {
		flex: 1,
		marginHorizontal: 8,
		backgroundColor: "#F3F6F6",
		borderRadius: 20,
		paddingHorizontal: 14,
		paddingVertical: 5,
	},
	textInput: {
		fontSize: 16,
		minHeight: 32,
		color: "#222",
	},
	sendButton: {
		marginLeft: 8,
		backgroundColor: "#11BC6B",
		borderRadius: 21,
		width: 38,
		height: 38,
		justifyContent: "center",
		alignItems: "center",
	},
});

export default Chat;

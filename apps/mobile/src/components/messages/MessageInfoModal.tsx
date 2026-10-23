import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { IMessage } from "@/src/interfaces/message-interface";
import Colors from "@/src/constants/Colors";

const formatTime = (timestamp?: number) =>
    timestamp
        ? new Date(timestamp).toLocaleString(undefined, {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
          })
        : "Not yet";

/** Long-press "Info" action — read/delivered/sent timestamps for a sent message. */
const MessageInfoModal = ({ message, visible, onClose }: { message: IMessage | null; visible: boolean; onClose: () => void }) => {
    if (!message) return null;

    const rows = [
        { key: "read", label: "Read", value: formatTime(message.readAt), icon: "checkmark-done" as const },
        { key: "delivered", label: "Delivered", value: formatTime(message.deliveredAt), icon: "checkmark" as const },
        { key: "sent", label: "Sent", value: formatTime(message.timestamp), icon: "paper-plane" as const },
    ];

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <Pressable style={styles.backdrop} onPress={onClose}>
                <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
                    <Text style={styles.title}>Message Info</Text>
                    {rows.map((row) => (
                        <View key={row.key} style={styles.row}>
                            <Ionicons name={row.icon} size={18} color={Colors.focused} />
                            <Text style={styles.rowLabel}>{row.label}</Text>
                            <Text style={styles.rowValue}>{row.value}</Text>
                        </View>
                    ))}
                </Pressable>
            </Pressable>
        </Modal>
    );
};

export default MessageInfoModal;

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.4)",
        justifyContent: "center",
        alignItems: "center",
    },
    card: {
        width: "80%",
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 20,
        gap: 14,
    },
    title: {
        fontSize: 16,
        fontWeight: "700",
        color: "#000E08",
        marginBottom: 4,
    },
    row: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    rowLabel: {
        flex: 1,
        fontSize: 14,
        color: "#000E08",
    },
    rowValue: {
        fontSize: 12,
        color: "#797C7B",
    },
});

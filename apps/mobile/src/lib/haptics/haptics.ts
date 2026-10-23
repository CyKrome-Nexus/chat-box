import * as Haptics from "expo-haptics";

/**
 * Named wrappers over expo-haptics matching the ticket's exact impact-level
 * mapping, so call sites read as intent ("light tap", "destructive warning")
 * instead of picking an ImpactFeedbackStyle from memory each time. Every
 * function is fire-and-forget and safe to call from anywhere (gesture
 * handlers, onPress, FlatList scroll callbacks).
 */

/** Tab bar items, toggles, reaction pills. */
export const hapticLightTap = () => {
	Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
};

/** Swipe-to-reply threshold reached, long-press context menu reveal. */
export const hapticMediumTap = () => {
	Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
};

/** Slide-to-cancel a voice note, delete message confirmation. */
export const hapticWarning = () => {
	Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
};

/** Scrolling through sticker pack / emoji picker categories. */
export const hapticSelectionChanged = () => {
	Haptics.selectionAsync();
};

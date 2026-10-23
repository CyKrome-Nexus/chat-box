import { Expo, type ExpoPushMessage } from "expo-server-sdk";
import type { Types } from "mongoose";

import { env } from "@/config/env";
import { Device } from "@/models/misc";

const expo = new Expo({ accessToken: env.EXPO_ACCESS_TOKEN });

export interface PushPayload {
  title: string;
  body: string;
  data: Record<string, string>;
  category?: string;
  priority?: "default" | "high";
  ttlSeconds?: number;
  collapseId?: string;
}

export const sendPush = async (userIds: (Types.ObjectId | string)[], payload: PushPayload): Promise<void> => {
  if (userIds.length === 0 || env.NODE_ENV === "test") return;
  const devices = await Device.find({ userId: { $in: userIds } }, { pushToken: 1 }).lean();
  const messages: ExpoPushMessage[] = devices
    .filter((device) => Expo.isExpoPushToken(device.pushToken))
    .map((device) => ({
      to: device.pushToken,
      title: payload.title,
      body: payload.body,
      data: payload.data,
      sound: "default",
      priority: payload.priority ?? "high",
      categoryId: payload.category,
      ttl: payload.ttlSeconds,
      collapseId: payload.collapseId,
      mutableContent: true,
    }));

  const staleTokens: string[] = [];
  for (const chunk of expo.chunkPushNotifications(messages)) {
    const tickets = await expo.sendPushNotificationsAsync(chunk).catch(() => []);
    tickets.forEach((ticket, index) => {
      const target = chunk[index]?.to;
      if (
        ticket.status === "error" &&
        ticket.details?.error === "DeviceNotRegistered" &&
        typeof target === "string"
      ) {
        staleTokens.push(target);
      }
    });
  }
  if (staleTokens.length > 0) await Device.deleteMany({ pushToken: { $in: staleTokens } });
};

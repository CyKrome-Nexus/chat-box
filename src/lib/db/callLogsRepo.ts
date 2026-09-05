import { getDatabase } from "./database";
import { ICallRibbon } from "@/src/interfaces/list-interface";

export const insertCallLog = async (call: ICallRibbon) => {
    const db = await getDatabase();
    await db.runAsync(
        `INSERT OR REPLACE INTO call_logs (id, contact_name, avatar_url, call_type, call_time, timestamp)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [call.id, call.name, call.avatar?.url || "", call.callType || "", call.callTime || "", Date.now()]
    );
};

export const listCallLogs = async (): Promise<ICallRibbon[]> => {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(`SELECT * FROM call_logs ORDER BY timestamp DESC`);
    return rows.map((row) => ({
        id: row.id,
        name: row.contact_name,
        avatar: { url: row.avatar_url || "" },
        callType: row.call_type,
        callTime: row.call_time,
    }));
};

export const clearCallLogsFromDb = async () => {
    const db = await getDatabase();
    await db.runAsync(`DELETE FROM call_logs`);
};

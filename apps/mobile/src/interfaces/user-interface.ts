import type { PrivacySettings, UserRole } from "@chatbox/shared";

export interface IUser {
   id: string;
   name: string;
   /** Private login identifier (email or phone), never shown to other users. */
   username: string;
   /** Public, globally unique @handle. */
   handle?: string;
   avatar?: { url?: string };
   about?: string;
   email?: string;
   phone?: string;
   role?: UserRole;
   privacy?: PrivacySettings;
   hasPassword?: boolean;
}

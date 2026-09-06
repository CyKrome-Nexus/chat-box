export interface IUser {
   id: string;
   name: string;
   /** The login identifier (phone number or email) — private, never shown to
    * other users. Not the same as `handle` below; kept as-is since it's
    * already load-bearing across auth/session/realtime code. */
   username: string;
   /** The public, globally-unique @handle — see docs/architecture/username-system.md.
    * Optional: a user isn't required to claim one. */
   handle?: string;
   avatar?: { url?: string };
   about?: string;
}
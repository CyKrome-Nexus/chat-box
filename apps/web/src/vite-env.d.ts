/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
}

interface Window {
  __CHATBOX_CONFIG__?: { apiUrl?: string };
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

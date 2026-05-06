import PusherJS from "pusher-js";

const client = new PusherJS(import.meta.env.VITE_PUSHER_APP_KEY, {
    cluster: "",
    wsHost: import.meta.env.VITE_PUSHER_HOST || "127.0.0.1",
    wsPort: import.meta.env.VITE_PUSHER_PORT || 6001,
    forceTLS: false,
    encrypted: true,
    disableStats: true,
    enabledTransports: ["ws", "wss"],
});

export default client;

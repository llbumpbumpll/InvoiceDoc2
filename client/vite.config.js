// Vite config for React app (ตั้งค่า dev server และปลั๊กอิน React)
// Example usage: `npm run dev` แล้วเปิด http://localhost:5173
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 }
});

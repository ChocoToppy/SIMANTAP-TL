import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

const dari = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      // Dua halaman: aplikasi utama + halaman sematan jadwal ruang (embed/ruang.html).
      input: { main: dari("./index.html"), embedRuang: dari("./embed/ruang.html") },
    },
  },
});

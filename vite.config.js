import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';

// basicSsl: camera (getUserMedia) requires a secure context — HTTPS lets a
// phone on the same wifi open the dev server and use its camera.
export default defineConfig({
  plugins: [react(), basicSsl()],
});

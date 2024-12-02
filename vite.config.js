import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command, mode }) => {
  // loadEnv를 사용하여 환경변수 불러오기
  const env = loadEnv(mode, process.cwd());

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/socket.io': {
          target: env.VITE_SOCKET_URL || 'http://localhost:3000',
          ws: true,
        },
      },
    },
  };
});
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "127.0.0.1",
    port: 8081,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:9000',
        changeOrigin: true,
        ws: true,
        configure: (proxy) => {
          proxy.on('error', (err, req, res) => {
            console.error(`[PROXY ERROR] ${req.method} ${req.url}:`, err.message);
            try {
              if (!res.headersSent) {
                res.writeHead(502, { 
                  'Content-Type': 'application/json',
                  'Access-Control-Allow-Origin': '*'
                });
                res.end(JSON.stringify({ 
                  success: false, 
                  error: 'Backend connection failed',
                  details: err.message
                }));
              }
            } catch (writeError) {
              console.error('[PROXY] Error writing error response:', writeError);
            }
          });
          
          proxy.on('proxyReq', (proxyReq, req) => {
            console.log(`[PROXY] ${req.method} ${req.url} -> ${proxyReq.getHeader('host')}`);
          });
        }
      },
      '/charts': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', (err, _req, res) => {
            try {
              res.writeHead(502, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: false, error: 'Backend unavailable' }));
            } catch {}
          });
        }
      }
    }
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));

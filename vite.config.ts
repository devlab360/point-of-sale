// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { VitePWA } from "vite-plugin-pwa";
import nodemailer from "nodemailer";
import { loadEnv } from "vite";

function emailDevPlugin() {
  return {
    name: 'configure-server',
    configureServer(server: any) {
      server.middlewares.use('/api/send-email', (req: any, res: any) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('Method Not Allowed');
          return;
        }
        
        let body = '';
        req.on('data', (chunk: any) => { body += chunk.toString(); });
        
        req.on('end', async () => {
          try {
            const data = JSON.parse(body);
            // Load env variables since this runs in node
            const env = loadEnv('', process.cwd(), '');
            
            const transporter = nodemailer.createTransport({
              host: env.VITE_SMTP_HOST || 'smtp.gmail.com',
              port: parseInt(env.VITE_SMTP_PORT || '587', 10),
              secure: parseInt(env.VITE_SMTP_PORT || '587', 10) === 465,
              auth: {
                user: env.VITE_SMTP_USER,
                pass: env.VITE_SMTP_PASS,
              },
            });

            const info = await transporter.sendMail({
              from: env.VITE_SMTP_FROM || env.VITE_SMTP_USER,
              to: data.to,
              subject: data.subject,
              html: data.html,
            });

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, messageId: info.messageId }));
          } catch (error: any) {
            console.error('Email error:', error);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, error: error.message }));
          }
        });
      });
    }
  }
}

export default defineConfig({
  vite: {
    plugins: [
      emailDevPlugin(),
      VitePWA({ 
        registerType: 'autoUpdate',
        devOptions: { enabled: true }, // Enable PWA in dev mode for testing offline
        manifest: {
          name: 'Grocer.Pro POS',
          short_name: 'GrocerPOS',
          theme_color: '#ffffff',
          display: 'standalone',
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,json}'],
        }
      })
    ]
  },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
    serverFns: {
      disableCsrfMiddlewareWarning: true,
    },
  },
});


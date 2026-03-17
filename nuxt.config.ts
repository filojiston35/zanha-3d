import vuetify, { transformAssetUrls } from "vite-plugin-vuetify";
import { defineNuxtConfig } from "nuxt/config";
import fs from "node:fs";
import path from "node:path";

export default defineNuxtConfig({
  // ön yüklemeyi devre dışı bırak
  typescript: {
    strict: true,
  },
  // devtools: { enabled: true },
  ssr: false,
  runtimeConfig: {
  },
  build: {
    transpile: ["vuetify"],
  },
  nitro: {
    preset: "vercel",
  },
  components: true,
  // Diğer yapılandırmalar
  app: {
    head: {
      titleTemplate: "Zanha 3D Web - %s",
      title: "Zanha 3D Web",
      htmlAttrs: {
        lang: "en",
      },
      meta: [
        { charset: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        { name: "description", content: "Zanha 3D Web" },
      ],
      link: [
        {
          rel: "icon",
          type: "image/png",
          sizes: "16x16",
          href: "/images/favicon-16x16.png",
        },
        {
          rel: "icon",
          type: "image/png",
          sizes: "32x32",
          href: "/images/favicon-32x32.png",
        },
      ],
    },
  },

  modules: [
    (_options, nuxt) => {
      // Havok wasm dosyasını public'e kopyala:
      // @babylonjs/havok paketinin exports'ı deep import'a izin vermediği için
      // wasm'ı /public üzerinden serve etmek en stabil yöntem.
      nuxt.hook("ready", () => {
        const src = path.resolve(
          nuxt.options.rootDir,
          "node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm",
        );
        const dstDir = path.resolve(nuxt.options.rootDir, "public/havok");
        const dst = path.join(dstDir, "HavokPhysics.wasm");

        try {
          if (!fs.existsSync(dst)) {
            fs.mkdirSync(dstDir, { recursive: true });
            fs.copyFileSync(src, dst);
          }
        } catch (e) {
          // Kopyalama başarısızsa Havok init aşamasında console error görürsün.
          console.warn("[havok] wasm copy failed", e);
        }
      });

      nuxt.hooks.hook("vite:extendConfig", (config) => {
        const anyConfig = config as any;
        anyConfig.plugins ||= [];
        anyConfig.plugins.push(vuetify({ autoImport: true }));
      });
    },
    "@pinia/nuxt",
  ],
  devServer: {
    host: "0.0.0.0",
    port: 3000,
  },
  vite: {
    assetsInclude: ["**/*.wasm"],
    css: {
      preprocessorOptions: {
        scss: {
          // Modern SCSS compiler kullanılıyor
        },
      },
    },
    vue: { template: { transformAssetUrls } },
    build: {
      minify: "terser",
      terserOptions: {
        compress: {
          drop_console: false, // 👈 console.* silinir
          drop_debugger: true, // 👈 debugger silinir
        },
      },
    },
  },
  plugins: ["~/plugins/moment.ts"],

  css: [
    "~/assets/css/index.scss",
  ],

  alias: {
    "~/assets": "_nuxt/assets",
  },
  compatibilityDate: "2026-01-29",
});

import { build } from "esbuild";
import { mkdir, copyFile } from "node:fs/promises";
await mkdir("public", { recursive: true });
await build({
  entryPoints: ["web/src/app.ts"],
  outfile: "public/app.js",
  bundle: true,
  target: "es2022",
  format: "esm",
  sourcemap: true,
});
for (const file of ["index.html", "style.css"])
  await copyFile(`web/public/${file}`, `public/${file}`);

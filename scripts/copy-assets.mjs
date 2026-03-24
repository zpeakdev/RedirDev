import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import process from "node:process";

const projectRoot = process.cwd();
const distDir = resolve(projectRoot, "dist");

async function copyFile(from, to) {
  await mkdir(dirname(to), { recursive: true });
  await cp(from, to);
}

async function buildDistManifest() {
  const manifestPath = resolve(projectRoot, "manifest.json");
  const manifestRaw = await readFile(manifestPath, "utf8");
  const manifest = JSON.parse(manifestRaw);

  // dist 作为加载目录，入口路径应以 dist 根目录为基准。
  if (manifest.background?.service_worker?.startsWith("dist/")) {
    manifest.background.service_worker =
      manifest.background.service_worker.replace(/^dist\//, "");
  }
  if (manifest.action?.default_popup?.startsWith("dist/")) {
    manifest.action.default_popup = manifest.action.default_popup.replace(
      /^dist\//,
      ""
    );
  }

  const target = resolve(distDir, "manifest.json");
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

await copyFile(
  resolve(projectRoot, "src", "popup", "popup.html"),
  resolve(distDir, "popup", "popup.html")
);
await copyFile(
  resolve(projectRoot, "src", "popup", "popup.css"),
  resolve(distDir, "popup", "popup.css")
);

await copyFile(
  resolve(projectRoot, "_locales", "zh_CN", "messages.json"),
  resolve(distDir, "_locales", "zh_CN", "messages.json")
);

await buildDistManifest();

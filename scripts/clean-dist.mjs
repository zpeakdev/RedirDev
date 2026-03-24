import { rm } from "node:fs/promises";
import { resolve } from "node:path";
import process from "node:process";

const distDir = resolve(process.cwd(), "dist");

await rm(distDir, { recursive: true, force: true });

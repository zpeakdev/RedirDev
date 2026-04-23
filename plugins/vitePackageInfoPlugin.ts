import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Plugin, ViteDevServer } from "vite";

export interface PackageInfoPluginOptions {
  /** package.json 文件路径，默认为项目根目录下的 package.json */
  packageJsonPath?: string;
  /** 虚拟模块 ID，默认为 'virtual:app-info' */
  virtualModuleId?: string;
  /** 要提取的字段，默认为 name、version、description */
  fields?: string[];
}

interface PackageData {
  [key: string]: string;
}

const DEFAULT_FIELDS = ["name", "version", "description"];

/**
 * 创建 Vite 虚拟模块插件，从 package.json 中提取指定字段并导出为常量
 *
 * @example
 * ```tsx
 * import { APP_NAME, APP_VERSION, APP_DESCRIPTION } from 'virtual:app-info'
 * ```
 */
export function createVitePackageInfoPlugin(options: PackageInfoPluginOptions = {}): Plugin {
  const {
    packageJsonPath,
    virtualModuleId = "virtual:app-info",
    fields = DEFAULT_FIELDS,
  } = options;

  const resolvedVirtualModuleId = `\0${virtualModuleId}`;
  let cachedPackageData: PackageData | null = null;

  /**
   * 读取并解析 package.json，返回指定字段的数据对象
   */
  function readPackageData(): PackageData {
    const jsonPath = packageJsonPath ?? resolve(process.cwd(), "package.json");
    const content = readFileSync(jsonPath, "utf-8");
    const pkg = JSON.parse(content);

    const data: PackageData = {};
    for (const field of fields) {
      if (pkg[field] !== undefined) {
        const key = `APP_${field.toUpperCase().replace(/[^A-Z0-9]/g, "_")}`;
        data[key] = pkg[field];
      }
    }
    return data;
  }

  return {
    name: "vite-plugin-package-info",

    resolveId(id) {
      if (id === virtualModuleId) {
        return resolvedVirtualModuleId;
      }
      return undefined;
    },

    load(id) {
      if (id === resolvedVirtualModuleId) {
        if (!cachedPackageData) {
          cachedPackageData = readPackageData();
        }

        const exports = Object.entries(cachedPackageData)
          .map(([key, value]) => `export const ${key} = ${JSON.stringify(value)};`)
          .join("\n");

        return `${exports}\n`;
      }
      return undefined;
    },

    configureServer(server: ViteDevServer) {
      // 监听 package.json 文件变更，支持 HMR 热更新
      const watchPath = packageJsonPath ?? resolve(process.cwd(), "package.json");
      server.watcher.add(watchPath);

      server.watcher.on("change", (file: string) => {
        if (resolve(file) === resolve(watchPath)) {
          // 重新读取并缓存最新的 package 数据
          try {
            cachedPackageData = readPackageData();
            // 发送全量重载事件触发页面刷新
            server.ws.send({ type: "full-reload" });
            console.log(`[vite-plugin-package-info] package.json 已更新，已重新加载`);
          } catch (error) {
            console.error(`[vite-plugin-package-info] 解析 package.json 失败:`, error);
          }
        }
      });
    },
  };
}

export default createVitePackageInfoPlugin;

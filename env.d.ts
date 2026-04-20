/**
 * virtual:app-info 模块的类型声明
 *
 * 由 vitePackageInfoPlugin 动态生成，提供 package.json 中的字段常量
 */
declare module 'virtual:app-info' {
  /** 应用名称（package.json 的 name 字段） */
  export const APP_NAME: string;
  /** 应用版本号（package.json 的 version 字段） */
  export const APP_VERSION: string;
  /** 应用描述信息（package.json 的 description 字段） */
  export const APP_DESCRIPTION: string;
}


interface Window {
  /** 插件的本地配置数据 */
  __READIRDEV_STATE__: StorageState;

  /** 是否已安装代理补丁，避免重复安装 */
  __REDIRDEV_PROXY_INSTALLED__?: boolean;
}

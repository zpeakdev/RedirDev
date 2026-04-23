/**
 * @see https://prettier.io/docs/configuration
 * @type {import("prettier").Config}
 */
const config = {
  trailingComma: "all", // 对象/数组最后一项加逗号（方便 git diff）
  semi: true, // 语句末尾加分号
  singleQuote: false, // 使用单引号
  printWidth: 100, // 单行代码超过 100 字符自动换行
  tabWidth: 2, // 缩进空格数
  arrowParens: "always", // 箭头函数单个参数也保留括号：(a) => a
  endOfLine: "lf", // 换行符使用 LF (Linux/Mac 标准)
  vueIndentScriptAndStyle: true, // Vue 文件内 <script> 和 <style> 增加一级缩进
  // 插件相关配置按需开启，基础项目无需额外配置
};

export default config;

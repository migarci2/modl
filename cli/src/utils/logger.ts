import chalk from "chalk";

const prefix = chalk.gray("[modl]");

export const logger = {
  info: (message: string) => console.log(prefix, message),
  warn: (message: string) => console.warn(prefix, chalk.yellow(message)),
  success: (message: string) => console.log(prefix, chalk.green(message)),
  error: (message: string) => console.error(prefix, chalk.red(message))
};

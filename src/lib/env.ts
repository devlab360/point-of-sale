export const appEnv = process.env.APP_ENV || "development";

export const isProduction = appEnv === "production";

export const isDev = !isProduction;

export const appName = process.env.APP_NAME || "OneDesk360";

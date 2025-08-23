import pino from "pino";

const level = process.env.LOG_LEVEL || "info";

export const logger = pino({
  name: "arch-photo-regenerator",
  level,
  transport: process.env.NODE_ENV !== "production" ? {
    target: "pino-pretty",
    options: { translateTime: "SYS:standard" }
  } : undefined
});

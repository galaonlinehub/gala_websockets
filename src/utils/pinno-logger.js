import pino from "pino";
import pretty from "pino-pretty";
import { join } from "path";
import fs from "fs";
import pinoMultiStream from "pino-multi-stream";


const { multistream } = pinoMultiStream;

const logDir = join(process.cwd(), "logs");
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

// Stream for rotating file logs (could integrate with external rotation tools)
const streams = [
  { stream: process.stdout }, 
  { stream: fs.createWriteStream(join(logDir, "app.log"), { flags: "a" }) },
];

const isProd = process.env.NODE_ENV === "production";

const prettyStream = pretty({
  colorize: true,
  translateTime: "SYS:standard",
  ignore: "pid,hostname",
});

const pinnoLogger = pino(
  {
    level: process.env.LOG_LEVEL || (isProd ? "info" : "debug"),
    base: { pid: false }, 
    timestamp: () => `,"time":"${new Date().toISOString()}"`,
    serializers: {
      err: pino.stdSerializers.err,
    },
  },
  isProd ? multistream(streams) : prettyStream
);

export default pinnoLogger;

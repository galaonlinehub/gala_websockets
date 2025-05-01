import express from "express";
import cors from "cors";
import path from "path";
import { config } from "./config/index.js";
import { errorMiddleware } from "./middleware/error.js";
import routes from "./routes/index.js";

const __dirname = path.resolve();

export function setupApp() {
  const app = express();

  app.use(
    cors({
      origin: config.corsOrigins,
      credentials: true,
    })
  );

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.use("/api", routes);

  app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "src/views/index.html"));
  });

  if (config.serveStatic) {
    app.use("/sfu/:room", express.static(path.join(__dirname, "public")));

    app.get("*", (req, res, next) => {
      const path = "/sfu/";
      if (req.path.indexOf(path) === 0 && req.path.length > path.length)
        return next();
      res.send(
        `You need to specify a room name in the path e.g. '${config.baseUrl}/sfu/room'`
      );
    });
  }

  app.use(errorMiddleware);

  return app;
}

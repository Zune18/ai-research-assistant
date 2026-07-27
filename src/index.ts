import { config } from "./config";
import { startServer } from "./api/server";

config.logger.info(`Starting research platform on port ${config.env.PORT}`);
startServer();
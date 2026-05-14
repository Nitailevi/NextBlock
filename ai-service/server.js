import { HOST, PORT } from "./src/config.js";
import { createApp } from "./src/createApp.js";

const server = createApp();

server.listen(PORT, HOST, () => {
  console.log(`NextBlock AI service running at http://${HOST}:${PORT}`);
});

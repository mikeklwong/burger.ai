import { createApp } from './app.mjs';
const port = Number(process.env.PORT || 3001);
const host = process.env.HOST || '127.0.0.1';
const server = await createApp({ dataDirectory: process.env.DATA_DIR });
server.listen(port, host, () => console.log(`burger.ai server: http://${host}:${port}`));

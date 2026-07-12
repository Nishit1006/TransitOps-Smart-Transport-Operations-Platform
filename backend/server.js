import "dotenv/config";
import app from "./src/app.js";
import prisma from "./src/config/prisma.js";

const PORT = process.env.PORT ?? 5000;

const server = app.listen(PORT, () => {
  console.log(`TransitOps API listening on port ${PORT}`);
});

const shutdown = async () => {
  server.close();
  await prisma.$disconnect();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

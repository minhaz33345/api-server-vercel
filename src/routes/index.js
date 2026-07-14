const locketRouter = require("./locket.route.js");

module.exports = (app) => {
  app.get("/", (req, res) => {
    res.json({ message: "🚀 Locket Dio API (Vercel-lite) is running!" });
  });

  const healthCheck = (req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  };
  app.get("/health", healthCheck);
  app.post("/health", healthCheck);

  app.use("/locket", locketRouter);
};

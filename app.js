const http = require("http");

const PORT = process.env.PORT || 8080;

const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "application/json" });

  const response = {
    app: "sample-nodejs-app",
    status: "running",
    timestamp: new Date().toISOString(),
    hostname: require("os").hostname()
  };

  res.end(JSON.stringify(response, null, 2));
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

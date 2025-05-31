const cluster = require("cluster");
const os = require("os");

const numCPUs = os.cpus().length;

if (cluster.isMaster) {
  console.log(`Master ${process.pid} is running`);

  // Fork worker cho mỗi CPU core
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  // Lắng nghe khi worker chết, tạo worker mới thay thế
  cluster.on("exit", (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died. Tạo worker mới.`);
    cluster.fork();
  });
} else {
  // Worker tiến hành chạy server của bạn
  require("./server.js");
  console.log(`Worker ${process.pid} started`);
}

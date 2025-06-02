import http from "k6/http";
import { check, sleep } from "k6";

export let options = {
  vus: 50, // Sử dụng 50 Virtual Users
  duration: "30s", // Chạy trong 30 giây
};

export default function () {
  // Kiểm tra trang index.html của server
  let res1 = http.get("http://localhost:5000/index.html");
  check(res1, {
    "index.html status is 200": (r) => r.status === 200,
  });

  // Kiểm tra API sản phẩm
  let res2 = http.get("http://localhost:5000/api/products");
  check(res2, {
    "API sản phẩm status is 200": (r) => r.status === 200,
  });

  // Kiểm tra API đơn hàng
  let res3 = http.get("http://localhost:5000/api/orders");
  check(res3, {
    "API đơn hàng status is 200": (r) => r.status === 200,
  });

  // Thực hiện sleep giữa các yêu cầu
  sleep(1);
}

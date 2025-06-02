// Hàm kiểm tra token và chuyển hướng nếu chưa đăng nhập
function checkAuth() {
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "/index.html";
    return false;
  }
  return true;
}

// Hàm đăng xuất
function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("username");
  window.location.href = "/index.html";
}

// Thêm token vào header cho các request API
function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

// Kiểm tra auth khi trang được load
document.addEventListener("DOMContentLoaded", function () {
  // Nếu không phải trang index.html, kiểm tra auth
  if (!window.location.pathname.endsWith("index.html")) {
    checkAuth();
  }
});

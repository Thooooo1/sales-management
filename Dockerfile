# Dùng image nodejs chính thức
FROM node:16

# Đặt thư mục làm việc trong container
WORKDIR /usr/src/app

# Sao chép package.json và package-lock.json vào container
COPY package*.json ./

# Cài đặt các dependency
RUN npm install

# Sao chép toàn bộ dự án vào container
COPY . .

# Expose port 5000
EXPOSE 5000

# Lệnh chạy ứng dụng
CMD ["npm", "start"]

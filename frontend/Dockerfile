FROM --platform=linux/arm64 node:20-alpine AS build

WORKDIR /app

COPY package*.json ./

RUN npm config set registry https://registry.npmmirror.com && \
    npm install --legacy-peer-deps

COPY . .

RUN npm run build

FROM --platform=linux/arm64 nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

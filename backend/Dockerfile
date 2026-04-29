FROM --platform=linux/arm64 node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm config set registry https://registry.npmmirror.com && \
    npm install --legacy-peer-deps

COPY . .

EXPOSE 3001

CMD ["npx", "tsx", "src/index.ts"]

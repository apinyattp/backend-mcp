FROM node:22-slim

# install dependencies
ADD ["./package.json", "./package-lock.json", "/app/"]
WORKDIR /app
RUN npm ci

# build
ADD [".", "/app/"]
RUN npm run build

# runtime config
EXPOSE 3000
CMD ["node", "dist/src/main"]
USER node

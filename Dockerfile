#FROM node:20.5.1
#LABEL authors="Victor"
#WORKDIR /usr/src/app
#COPY package.json ./
#RUN npm install
#COPY . .
#EXPOSE 3000
#ENV TZ='Etc/GMT'
#CMD ["npm", "start"]

# Build stage
FROM node:20.5.1-slim as builder
WORKDIR /usr/src/app
COPY package.json ./
RUN npm install --silent
COPY . .
RUN npm run build

# Production stage
FROM node:20.5.1-slim
WORKDIR /usr/src/app
COPY --from=builder /usr/src/app/dist ./dist
COPY package.json ./
RUN npm install --omit=dev --silent && npm cache clean --force
EXPOSE 3000
CMD ["node", "dist/index.js"]

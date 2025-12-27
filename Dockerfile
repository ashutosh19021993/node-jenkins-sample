FROM node:18-alpine

# Create non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

COPY package.json .
RUN npm install --production

COPY app.js .

USER appuser

EXPOSE 8080

CMD ["npm", "start"]

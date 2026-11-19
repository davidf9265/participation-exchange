FROM node:24-alpine

WORKDIR /app

# Dependencies are installed at image build time. The source tree is bind-mounted
# at runtime (see docker-compose.yml), and node_modules is kept in a named volume
# so the host tree stays clean.
COPY package.json ./
RUN npm install

COPY . .

EXPOSE 3000
CMD ["npm", "run", "dev"]

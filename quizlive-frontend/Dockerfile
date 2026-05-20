# For local dev: build the frontend with local npm first, then just copy dist into nginx.
# Run: npm install && npm run build   before docker compose up --build
#
# For CI/production: swap this file with Dockerfile.prod which runs npm ci inside Docker.
FROM nginx:1.25-alpine
COPY dist /usr/share/nginx/html
EXPOSE 80 443

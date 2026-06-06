# ---------- BUILD ----------
FROM node:20-alpine AS build
WORKDIR /usr/src/app

COPY package.json package-lock.json ./
COPY prisma ./prisma

RUN npm ci
RUN npx prisma generate

COPY . .
RUN npm run build
RUN npx tsc tools/seeds.ts --outDir dist/tools --module nodenext --moduleResolution nodenext --target ES2023 --esModuleInterop --skipLibCheck


# ---------- RUNTIME ----------
FROM node:20-alpine
WORKDIR /usr/src/app

ENV NODE_ENV=production

# just need
COPY --from=build /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/dist ./dist
COPY --from=build /usr/src/app/prisma ./prisma
COPY --from=build /usr/src/app/tools/run-seed.js ./tools/run-seed.js
COPY --from=build /usr/src/app/tools/imgs.json ./dist/tools/imgs.json
COPY package.json ./

# remove devDependencies
RUN npm prune --omit=dev

# Create a system group for the application
RUN addgroup -S app \
  # Create a system user and assign it to the app group
  && adduser -S app -G app

# Run the application as a non-root user for security reasons
USER app

EXPOSE 3001
CMD ["node", "dist/src/main.js"]

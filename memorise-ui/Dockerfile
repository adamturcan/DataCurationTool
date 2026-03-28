# Stage 1: Build
FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

COPY . .

ARG VITE_BASE_PATH=/
ARG VITE_NER_API_URL=https://ner-api.dev.memorise.sdu.dk/recognize
ARG VITE_SEGMENT_API_URL=https://textseg-api.dev.memorise.sdu.dk/segment
ARG VITE_CLASSIFY_API_URL=https://semtag-api.dev.memorise.sdu.dk/classify
ARG VITE_TRANSLATION_API_URL=https://mt-api.dev.memorise.sdu.dk

RUN echo "VITE_BASE_PATH=$VITE_BASE_PATH" > .env && \
    echo "VITE_NER_API_URL=$VITE_NER_API_URL" >> .env && \
    echo "VITE_SEGMENT_API_URL=$VITE_SEGMENT_API_URL" >> .env && \
    echo "VITE_CLASSIFY_API_URL=$VITE_CLASSIFY_API_URL" >> .env && \
    echo "VITE_TRANSLATION_API_URL=$VITE_TRANSLATION_API_URL" >> .env

RUN npx tsc -b && npx vite build

# Stage 2: Serve
FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

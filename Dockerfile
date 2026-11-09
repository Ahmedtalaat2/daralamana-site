# يبني الموقع ويشغله على nginx (Coolify يكتشف الملف ده تلقائياً)
FROM python:3.12-alpine AS build
WORKDIR /src
COPY . .
ARG SITE_URL
ENV SITE_URL=${SITE_URL}
RUN python3 build.py dist

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /src/dist /usr/share/nginx/html
EXPOSE 80

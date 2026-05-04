# Deploy Backend to AWS Lightsail

This deployment path runs the Spring Boot backend directly on a Lightsail VM using `systemd`.

## 1) Build the backend jar locally

```bash
cd backend
mvn clean package -DskipTests
```

Artifact will be created under `backend/target/`.

## 2) Copy deploy bundle + jar to the instance

```bash
# From repo root
scp -r backend/deploy/lightsail ubuntu@<LIGHTSAIL_IP>:/tmp/lightsail-deploy
scp backend/target/*.jar ubuntu@<LIGHTSAIL_IP>:/tmp/rule-engine-backend.jar
```

## 3) Bootstrap the instance (one-time)

```bash
ssh ubuntu@<LIGHTSAIL_IP>
cd /tmp/lightsail-deploy
sudo bash install-on-instance.sh
```

## 4) Configure runtime env

Edit `/etc/truly/backend.env` and set:

- `SPRING_PROFILES_ACTIVE`: typically `production,postgresql`
- DB credentials (`POSTGRES_*` or `MYSQL_*`)
- `APP_CORS_ALLOWED_ORIGINS`: include your frontend domains (Vercel/custom)
- JVM settings (`JAVA_OPTS`)

## 5) Deploy the jar

```bash
cd /tmp/lightsail-deploy
sudo bash deploy-from-artifact.sh /tmp/rule-engine-backend.jar
```

## 6) Verify health + logs

```bash
curl http://127.0.0.1:8092/api/health
sudo journalctl -u truly-backend -f
```

## 7) Open Lightsail networking

Allow inbound TCP:

- `8092` from your reverse proxy/load balancer, or
- `80/443` if you place Nginx in front and keep backend private on localhost.

## Notes

- Service unit: `/etc/systemd/system/truly-backend.service`
- App path: `/opt/truly/backend/app.jar`
- Env file: `/etc/truly/backend.env`
- Data/log dirs: `/opt/truly/data`, `/var/log/truly`

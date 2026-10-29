FROM maven:3.9-eclipse-temurin-21-alpine AS builder

WORKDIR /app

# Copy SDK and install
COPY tapsilat-java tapsilat-java
WORKDIR /app/tapsilat-java
RUN mvn clean install -DskipTests -Dgpg.skip

# Copy Example and build
WORKDIR /app
COPY examples/java examples/java
WORKDIR /app/examples/java
RUN mvn clean package -DskipTests

FROM eclipse-temurin:21-jre-alpine

WORKDIR /app
COPY --from=builder /app/examples/java/target/*.jar app.jar
COPY --from=builder /app/examples/java/.env .env

EXPOSE 8080
CMD ["java", "-jar", "app.jar"]

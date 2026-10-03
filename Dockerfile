#stage 1 : build stage maven + jdk 21

FROM maven:3.9.6-eclipse-temurin-21-alpine AS builder

WORKDIR /app

#coppy pom.xml and download dependencies (Layer caching)

COPY pom.xml .
RUN mvn dependency:go-offline -B

# copy source code and build jar
COPY src ./src
RUN mvn clean package -DskipTests -B

#stage 2 : runtime stage (LIGHTWEIGHT JRE 21)

FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

#create a non-root system user for production security 

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

#copy jar from builder stage

COPY --from=builder /app/target/risingfield.jar app.jar

#set permission

RUN chown -R appuser:appgroup /app
USER appuser

EXPOSE 8096

#Environment defaults
ENV SPRING_PROFILES_ACTIVE=prod \
    JAVA_OPTS="-Xms256m -Xmx512m"

ENTRYPOINT ["sh", "-c" , "java $JAVA_OPTS -jar app.jar"]


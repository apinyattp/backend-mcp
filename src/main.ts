import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global prefix for API versioning (MCP endpoint excluded)
  app.setGlobalPrefix("api/v1", {
    exclude: ["mcp"],
  });

  // Validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Global exception filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // CORS (must be before helmet)
  const corsOrigins = process.env.CORS_ORIGINS?.split(",") || ["*"];
  app.enableCors({
    origin: corsOrigins,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Mcp-Session-Id"],
    exposedHeaders: ["Mcp-Session-Id"],
    credentials: true,
  });

  // Security
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
    }),
  );

  // Swagger
  const config = new DocumentBuilder()
    .setTitle("Knowledge Hub API")
    .setDescription("Team-based knowledge base management with semantic search")
    .setVersion("1.0")
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api/docs", app, document);

  const port = parseInt(process.env.PORT ?? "3000", 10);
  await app.listen(port, "0.0.0.0");

  console.log(`Knowledge Hub API listening on http://0.0.0.0:${port}`);
  console.log(`API docs: http://localhost:${port}/api/docs`);
  console.log(`MCP endpoint: http://localhost:${port}/mcp`);
}

bootstrap();

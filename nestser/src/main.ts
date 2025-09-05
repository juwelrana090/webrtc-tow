import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { IoAdapter } from '@nestjs/platform-socket.io';
import * as cors from 'cors';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(cors.default());
  app.useWebSocketAdapter(new IoAdapter(app));

  const PORT = process.env.PORT || 5000;
  await app.listen(PORT);
  console.log(`🚀 Server is running on port ${PORT}`);
}

void bootstrap();

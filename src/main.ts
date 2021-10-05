import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PrivateAppModule } from './private.app.module';
import { RabbitMqProcessorModule } from './rabbitmq.processor.module';
import { TransactionsProcessorModule } from './transaction.processor.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );
  await app.listen(process.env.PORT);

  if (process.env.ENABLE_PRIVATE_API === 'true') {
    const privateApp = await NestFactory.create(PrivateAppModule);
    await privateApp.listen(
      parseInt(process.env.PRIVATE_PORT),
      process.env.PRIVATE_LISTEN_ADDRESS,
    );
  }

  // if (process.env.ENABLE_TRANSACTION_PROCESSOR === 'true') {
  //   const privateTransactionsApp = await NestFactory.create(
  //     TransactionsProcessorModule,
  //   );
  //   await privateTransactionsApp.listen(
  //     parseInt(process.env.TRANSACTION_PROCESSOR_PORT),
  //     process.env.TRANSACTION_PROCESSOR_LISTEN_ADDRESS,
  //   );
  // }

  if (process.env.ENABLE_RABBITMQ === 'true') {
    const rabbitMq = await NestFactory.create(RabbitMqProcessorModule);
    await rabbitMq.listen(
      parseInt(process.env.RABBITMQ_PORT),
      process.env.RABBITMQ_LISTEN_URL,
    );
  }
}

bootstrap();

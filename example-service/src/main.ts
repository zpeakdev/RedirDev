import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 开发环境：支持动态源（包括线上域名和本地各种端口）
  // app.enableCors({
  //   origin: (origin, callback) => {
  //     console.log('🚀 ~ bootstrap ~ origin:', origin);
  //     // 允许的源列表
  //     const allowedOrigins = ['https://zhanggaofeng.cn'];

  //     // 开发环境：允许 undefined（浏览器扩展、Postman 等）

  //     if (!origin || allowedOrigins.includes(origin)) {
  //       callback(null, true);
  //     } else {
  //       callback(new Error('Not allowed by CORS'));
  //     }
  //   },
  //   credentials: true,
  //   methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  //   allowedHeaders: 'Content-Type, Authorization, X-Requested-With',
  // });
  app.enableCors({
    origin: ['https://zhanggaofeng.cn'],
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Authorization, X-Requested-With',
  });

  await app.listen(process.env.PORT ?? 3000);
  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();

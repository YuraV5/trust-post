import { Module } from '@nestjs/common';
import { PublicPaymentsController, UserPaymentsController } from './controllers';
import { PaymentsService } from './services';
import { PaymentAttemptsRepo, PaymentsRepo } from './repo';
import { PaymentGatewayFactory, WayForPayGateway } from './providers';

@Module({
  controllers: [PublicPaymentsController, UserPaymentsController],
  providers: [PaymentsService, PaymentsRepo, PaymentAttemptsRepo, PaymentGatewayFactory, WayForPayGateway],
  exports: [PaymentsService],
})
export class PaymentsModule {}

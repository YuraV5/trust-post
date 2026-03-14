import { Injectable } from '@nestjs/common';
import { PaymentProvider } from '@prisma/client';
import { AppBadRequestException } from '../../../shared/errors/app-errors';
import { IPaymentGateway, IPaymentGatewayFactory } from '../interfaces';
import { WayForPayGateway } from './wayforpay.gateway';

@Injectable()
export class PaymentGatewayFactory implements IPaymentGatewayFactory {
  constructor(private readonly wayForPayGateway: WayForPayGateway) {}

  get(provider: PaymentProvider): IPaymentGateway {
    switch (provider as PaymentProvider) {
      case PaymentProvider.WAYFORPAY:
        return this.wayForPayGateway;
      default:
        throw new AppBadRequestException(`Unsupported payment provider: ${provider}`);
    }
  }
}

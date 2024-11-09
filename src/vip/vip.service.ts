import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Vip } from './entities/vip.entity';
import { Repository } from 'typeorm';
import { User } from '../user/entities/user.entity';
import { ConfigService } from '@nestjs/config';
import { customAlphabet } from 'nanoid';
import { WebhookDto } from './dto/webhook.dto';

@Injectable()
export class VipService {
  constructor(
    private readonly httpService: HttpService,
    @InjectRepository(Vip) private readonly vipRepository: Repository<Vip>,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    private readonly configService: ConfigService,
  ) {}

  async pay(user: User) {
    user = await this.userRepository.findOne({
      where: {
        id: user.id,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.vip?.paymentStatus === 'SUCCESS') {
      throw new BadRequestException('User already has VIP');
    }

    const result = await this.vipRepository.manager.transaction(
      async (transactionalEntityManager) => {
        const checkVip = await transactionalEntityManager.findOne(Vip, {
          where: {
            user: {
              id: user.id,
            },
          },
        });

        if (!checkVip || checkVip?.paymentStatus === 'FAILED') {
          if (checkVip?.paymentStatus === 'FAILED') {
            await transactionalEntityManager.queryRunner.manager.delete(
              Vip,
              checkVip.id,
            );
          }

          const vip = new Vip();
          vip.id = customAlphabet('1234567890abcdef', 32)();
          vip.user = user;
          vip.paymentStatus = 'CREATED';
          const { token, redirect_url } = await this.generateMidtransToken(
            vip.id,
          );
          vip.token = token;

          await transactionalEntityManager.save(Vip, vip);

          return {
            token,
            redirect_url,
          };
        }

        if (checkVip.paymentStatus === 'CREATED') {
          const { token, redirect_url } = await this.generateMidtransToken(
            checkVip.id,
          );
          checkVip.token = token;

          await transactionalEntityManager.save(Vip, checkVip);

          return {
            token,
            redirect_url,
          };
        }

        if (checkVip.paymentStatus === 'PENDING') {
          return {
            token: checkVip.token,
            redirect_url:
              'https://app.sandbox.midtrans.com/snap/v2/vtweb/' +
              checkVip.token,
          };
        }
      },
    );

    return result as { token: string; redirect_url: string };
  }

  async webhook(body: WebhookDto) {
    const {
      order_id: orderId,
      transaction_status: transactionStatus,
      fraud_status: fraudStatus,
    } = body;

    const vip = await this.vipRepository.findOne({
      where: {
        id: orderId,
      },
    });

    if (!vip) {
      return;
    }

    if (transactionStatus === 'capture') {
      if (fraudStatus === 'accept') {
        vip.paymentStatus = 'SUCCESS';
        vip.paymentDate = new Date(body.transaction_time);
      }
    } else if (transactionStatus === 'settlement') {
      vip.paymentStatus = 'SUCCESS';
      vip.paymentDate = new Date(body.transaction_time);
    } else if (
      transactionStatus === 'cancel' ||
      transactionStatus === 'deny' ||
      transactionStatus === 'expire'
    ) {
      vip.paymentStatus = 'FAILED';
    } else if (transactionStatus === 'pending') {
      vip.paymentStatus = 'PENDING';
    }

    await this.vipRepository.save(vip);
  }

  async getNotificationFromMidtrans(id: string) {
    const checkTransactionFromMidtrans = await this.httpService.axiosRef.get(
      `https://api.sandbox.midtrans.com/v2/${id}/status`,
      {
        headers: {
          Accept: 'application/json',
          Authorization:
            'Basic ' +
            btoa(this.configService.get('MIDTRANS_SERVER_KEY') + ':'),
          'Content-Type': 'application/json',
        },
      },
    );

    const { transaction_status: transactionStatus, fraud_status: fraudStatus } =
      checkTransactionFromMidtrans.data;

    if (transactionStatus === 'capture') {
      if (fraudStatus === 'accept') {
        return 'SUCCESS';
      }
    } else if (transactionStatus === 'settlement') {
      return 'SUCCESS';
    } else if (
      transactionStatus === 'cancel' ||
      transactionStatus === 'deny' ||
      transactionStatus === 'expire'
    ) {
      return 'FAILED';
    } else if (transactionStatus === 'pending') {
      return 'PENDING';
    }
  }

  async generateMidtransToken(id: string) {
    const result = await this.httpService.axiosRef.post(
      'https://app.sandbox.midtrans.com/snap/v1/transactions',
      {
        transaction_details: {
          order_id: id,
          gross_amount: 15000,
        },
      },
      {
        headers: {
          Accept: 'application/json',
          Authorization:
            'Basic ' +
            btoa(this.configService.get('MIDTRANS_SERVER_KEY') + ':'),
          'Content-Type': 'application/json',
        },
      },
    );

    if (result.status !== 201) {
      throw new BadRequestException('Failed to create transaction');
    }

    return {
      token: result.data.token,
      redirect_url: result.data.redirect_url,
    };
  }
}

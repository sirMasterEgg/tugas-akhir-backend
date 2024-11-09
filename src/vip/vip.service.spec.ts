import { Test, TestingModule } from '@nestjs/testing';
import { VipService } from './vip.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Vip } from './entities/vip.entity';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { User } from '../user/entities/user.entity';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AxiosResponse } from 'axios';

jest.mock('nanoid', () => {
  const originalModule = jest.requireActual('nanoid');
  return {
    ...originalModule,
    customAlphabet: jest.fn(() => () => 'mockedId'), // Mock customAlphabet to return a function that returns 'mockedId'
  };
});

describe('VipService', () => {
  let service: VipService;
  let httpService: HttpService;
  let vipRepository: Repository<Vip>;
  let userRepository: Repository<User>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VipService,
        {
          provide: getRepositoryToken(Vip),
          useValue: {
            manager: {
              transaction: jest.fn((cb) => {
                cb({
                  findOne: jest.fn(),
                  save: jest.fn(),
                  queryRunner: {
                    manager: {
                      findOne: jest.fn(),
                      save: jest.fn(),
                    },
                  },
                });
              }),
            },
          },
        },
        {
          provide: getRepositoryToken(User),
          useClass: Repository,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
        {
          provide: HttpService,
          useValue: {
            axiosRef: {
              get: jest.fn(),
              post: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<VipService>(VipService);
    httpService = module.get<HttpService>(HttpService);
    vipRepository = module.get<Repository<Vip>>(getRepositoryToken(Vip));
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('pay', () => {
    it('should throw NotFoundException if user is not found', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);

      await expect(service.pay({ id: '1' } as User)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if user already has VIP', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue({
        id: '1',
        vip: { paymentStatus: 'SUCCESS' },
      } as User);

      await expect(service.pay({ id: '1' } as User)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should delete failed data first', async () => {
      const user = { id: '1' } as User;
      const vip = { id: '1', paymentStatus: 'FAILED' } as Vip;

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(user);
      vipRepository.findOne = jest.fn().mockResolvedValue(vip);

      const mockEntityManager = {
        findOne: jest.fn().mockResolvedValueOnce(vip),
        save: jest.fn().mockResolvedValue({ ...vip, paymentStatus: 'CREATED' }),
        queryRunner: {
          manager: {
            delete: jest.fn().mockImplementation(() => Promise.resolve()),
          },
        },
      } as unknown as EntityManager;

      vipRepository.manager.transaction = jest
        .fn()
        .mockImplementation(async (cb) => cb(mockEntityManager));

      httpService.axiosRef.post = jest.fn().mockResolvedValue({
        data: {
          token: 'mockedToken',
          redirect_url: 'url/token',
        },
        status: 201,
      });

      await service.pay(user);

      expect(mockEntityManager.queryRunner.manager.delete).toHaveBeenCalledWith(
        Vip,
        vip.id,
      );
    });

    it('should add token if data already created', async () => {
      const user = { id: '1' } as User;
      const vip = { id: '1', paymentStatus: 'CREATED' } as Vip;

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(user);
      vipRepository.findOne = jest.fn().mockResolvedValue(vip);

      const mockEntityManager = {
        findOne: jest.fn().mockResolvedValueOnce(vip),
        save: jest.fn().mockResolvedValue({ ...vip, paymentStatus: 'CREATED' }),
        queryRunner: {
          manager: {
            delete: jest.fn().mockImplementation(() => Promise.resolve()),
          },
        },
      } as unknown as EntityManager;

      vipRepository.manager.transaction = jest
        .fn()
        .mockImplementation(async (cb) => cb(mockEntityManager));

      httpService.axiosRef.post = jest.fn().mockResolvedValue({
        data: {
          token: 'mockedToken',
          redirect_url: 'url/token',
        },
        status: 201,
      });

      await service.pay(user);

      expect(mockEntityManager.save).toHaveBeenCalledWith(
        Vip,
        expect.objectContaining({
          id: vip.id,
          paymentStatus: 'CREATED',
          token: 'mockedToken', // Check for new token
        }),
      );
    });

    it('should return exist token if data already pending', async () => {
      const user = { id: '1' } as User;
      const vip = {
        id: '1',
        paymentStatus: 'PENDING',
        token: 'existingToken',
      } as Vip;

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(user);
      vipRepository.findOne = jest.fn().mockResolvedValue(vip);

      const mockEntityManager = {
        findOne: jest.fn().mockResolvedValueOnce(vip),
        save: jest.fn().mockResolvedValue({ ...vip, paymentStatus: 'PENDING' }),
        queryRunner: {
          manager: {
            delete: jest.fn().mockImplementation(() => Promise.resolve()),
          },
        },
      } as unknown as EntityManager;

      vipRepository.manager.transaction = jest
        .fn()
        .mockImplementation(async (cb) => cb(mockEntityManager));

      httpService.axiosRef.post = jest.fn().mockResolvedValue({
        data: {
          token: 'mockedToken',
          redirect_url: 'url/token',
        },
        status: 201,
      });

      const result = await service.pay(user);

      expect(mockEntityManager.save).not.toHaveBeenCalled();
      expect(result).toEqual({
        token: vip.token,
        redirect_url: `https://app.sandbox.midtrans.com/snap/v2/vtweb/${vip.token}`,
      });
    });

    it('should create a new VIP if user does not have one', async () => {
      const user = { id: '1' } as User;
      const vip = new Vip();

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(user);

      const mockEntityManager = {
        findOne: jest.fn().mockResolvedValueOnce(null),
        save: jest.fn().mockResolvedValue(vip),
        queryRunner: {
          manager: {
            delete: jest.fn(),
          },
        },
      } as unknown as EntityManager;

      vipRepository.manager.transaction = jest
        .fn()
        .mockImplementation(async (cb) => cb(mockEntityManager));

      httpService.axiosRef.post = jest.fn().mockResolvedValue({
        data: {
          token: 'mockedToken',
          redirect_url: 'url/token',
        },
        status: 201,
      });

      const result = await service.pay(user);
      expect(result.token).toBe('mockedToken');
    });
  });

  describe('webhook', () => {
    it('should update VIP status to SUCCESS on "capture" with fraudStatus "accept"', async () => {
      const vip = { id: 'vipId' } as Vip;

      vipRepository.findOne = jest.fn().mockResolvedValue(vip);
      vipRepository.save = jest.fn().mockResolvedValue(vip);

      await service.webhook({
        order_id: 'vipId',
        transaction_status: 'capture',
        fraud_status: 'accept',
        transaction_time: new Date().toISOString(),
      });

      expect(vip.paymentStatus).toBe('SUCCESS');
    });

    it('should update VIP status to SUCCESS on "settlement"', async () => {
      const vip = { id: 'vipId' } as Vip;

      vipRepository.findOne = jest.fn().mockResolvedValue(vip);
      vipRepository.save = jest.fn().mockResolvedValue(vip);

      await service.webhook({
        order_id: 'vipId',
        transaction_status: 'settlement',
        fraud_status: '',
        transaction_time: new Date().toISOString(),
      });

      expect(vip.paymentStatus).toBe('SUCCESS');
      expect(vip.paymentDate).toBeDefined();
      expect(vipRepository.save).toHaveBeenCalledWith(vip);
    });

    it('should update VIP status to FAILED on "cancel"', async () => {
      const vip = { id: 'vipId' } as Vip;

      vipRepository.findOne = jest.fn().mockResolvedValue(vip);
      vipRepository.save = jest.fn().mockResolvedValue(vip);

      await service.webhook({
        order_id: 'vipId',
        transaction_status: 'cancel',
        fraud_status: '',
        transaction_time: new Date().toISOString(),
      });

      expect(vip.paymentStatus).toBe('FAILED');
    });

    it('should update VIP status to FAILED on "deny"', async () => {
      const vip = { id: 'vipId' } as Vip;

      vipRepository.findOne = jest.fn().mockResolvedValue(vip);
      vipRepository.save = jest.fn().mockResolvedValue(vip);

      await service.webhook({
        order_id: 'vipId',
        transaction_status: 'deny',
        fraud_status: '',
        transaction_time: new Date().toISOString(),
      });

      expect(vip.paymentStatus).toBe('FAILED');
      expect(vipRepository.save).toHaveBeenCalledWith(vip);
    });

    it('should update VIP status to FAILED on "expire"', async () => {
      const vip = { id: 'vipId' } as Vip;

      vipRepository.findOne = jest.fn().mockResolvedValue(vip);
      vipRepository.save = jest.fn().mockResolvedValue(vip);

      await service.webhook({
        order_id: 'vipId',
        transaction_status: 'expire',
        fraud_status: '',
        transaction_time: new Date().toISOString(),
      });

      expect(vip.paymentStatus).toBe('FAILED');
      expect(vipRepository.save).toHaveBeenCalledWith(vip);
    });

    it('should update VIP status to PENDING on "pending"', async () => {
      const vip = { id: 'vipId' } as Vip;

      vipRepository.findOne = jest.fn().mockResolvedValue(vip);
      vipRepository.save = jest.fn().mockResolvedValue(vip);

      await service.webhook({
        order_id: 'vipId',
        transaction_status: 'pending',
        fraud_status: '',
        transaction_time: new Date().toISOString(),
      });

      expect(vip.paymentStatus).toBe('PENDING');
      expect(vipRepository.save).toHaveBeenCalledWith(vip);
    });

    it('should return early if VIP record is not found', async () => {
      vipRepository.findOne = jest.fn().mockResolvedValue(null);
      vipRepository.save = jest.fn();

      await service.webhook({
        order_id: 'nonExistentId',
        transaction_status: 'pending',
        fraud_status: '',
        transaction_time: new Date().toISOString(),
      });

      expect(vipRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('getNotificationFromMidtrans', () => {
    it('should return SUCCESS if Midtrans status is capture with accept', async () => {
      const axiosResponse: Partial<AxiosResponse> = {
        data: { transaction_status: 'capture', fraud_status: 'accept' },
      };
      jest
        .spyOn(httpService.axiosRef, 'get')
        .mockResolvedValue(axiosResponse as AxiosResponse);

      const result = await service.getNotificationFromMidtrans('transactionId');
      expect(result).toBe('SUCCESS');
    });

    it('should return FAILED if Midtrans status is deny', async () => {
      const axiosResponse: Partial<AxiosResponse> = {
        data: { transaction_status: 'deny', fraud_status: '' },
      };
      jest
        .spyOn(httpService.axiosRef, 'get')
        .mockResolvedValue(axiosResponse as AxiosResponse);

      const result = await service.getNotificationFromMidtrans('transactionId');
      expect(result).toBe('FAILED');
    });
  });

  describe('generateMidtransToken', () => {
    it('should return a token and redirect_url on success', async () => {
      const axiosResponse: Partial<AxiosResponse> = {
        status: 201,
        data: { token: 'mockedToken', redirect_url: 'mockedUrl' },
      };

      jest
        .spyOn(httpService.axiosRef, 'post')
        .mockResolvedValue(axiosResponse as AxiosResponse);

      const result = await service.generateMidtransToken('orderId');
      expect(result.token).toBe('mockedToken');
      expect(result.redirect_url).toBe('mockedUrl');
    });

    it('should throw BadRequestException if Midtrans request fails', async () => {
      const axiosResponse: Partial<AxiosResponse> = { status: 400 };
      jest
        .spyOn(httpService.axiosRef, 'post')
        .mockResolvedValue(axiosResponse as AxiosResponse);

      await expect(service.generateMidtransToken('orderId')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});

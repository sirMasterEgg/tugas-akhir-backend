import { Test, TestingModule } from '@nestjs/testing';
import { FileService } from './file.service';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { InternalServerErrorException } from '@nestjs/common';
import { FileType } from '../helpers/file-type';

jest.mock('@aws-sdk/client-s3');
jest.mock('nanoid', () => {
  const originalModule = jest.requireActual('nanoid');
  return {
    ...originalModule,
    customAlphabet: jest.fn(() => () => 'mockedId'), // Mock customAlphabet to return a function that returns 'mockedId'
  };
});
jest.mock('../helpers/file-type');

describe('FileService', () => {
  let service: FileService;
  let s3Client: S3Client;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FileService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string) => {
              switch (key) {
                case 'S3_BUCKET_NAME':
                  return 'test-bucket';
                case 'S3_REGION':
                  return 'test-region';
                case 'S3_ACCESS_KEY':
                  return 'test-access-key';
                case 'S3_SECRET_ACCESS_KEY':
                  return 'test-secret-key';
                default:
                  return null;
              }
            }),
          },
        },
      ],
    }).compile();

    service = module.get<FileService>(FileService);
    configService = module.get<ConfigService>(ConfigService);
    s3Client = new S3Client({ region: 'test-region' });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('saveFile', () => {
    it('should store file to AWS if file is buffer', async () => {
      const fileBuffer = Buffer.from('test file content');
      const expectedUrl =
        'https://test-bucket.s3.test-region.amazonaws.com/mockedId.ext';

      service.storeFileAws = jest.fn().mockResolvedValue(expectedUrl);

      const result = await service.saveFile(fileBuffer);
      expect(result).toBe(expectedUrl);
      expect(service.storeFileAws).toHaveBeenCalledWith(
        fileBuffer,
        'test-bucket',
      );
    });
  });

  describe('storeFileAws', () => {
    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should upload a file to S3 and return its URL', async () => {
      const fileBuffer = Buffer.from('test file content');
      const fileUrl =
        'https://test-bucket.s3.test-region.amazonaws.com/mockedId.ext';

      FileType.fromBuffer = jest
        .fn()
        .mockResolvedValue({ ext: 'ext', mime: 'mime' });

      s3Client.send = jest.fn().mockImplementation((command) => {
        expect(command).toBeInstanceOf(PutObjectCommand);
      });

      const result = await service.storeFileAws(fileBuffer, 'test-bucket');

      expect(result).toBe(fileUrl);
    });

    it('should throw InternalServerErrorException on S3 upload failure', async () => {
      const fileBuffer = Buffer.from('test file content');

      FileType.fromBuffer = jest
        .fn()
        .mockResolvedValue({ ext: 'ext', mime: 'mime' });
      jest
        .spyOn(s3Client, 'send')
        .mockRejectedValue(new Error('S3 upload error') as never);

      await expect(
        service.storeFileAws(fileBuffer, 'test-bucket'),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('getFileUrl', () => {
    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should return the correct URL for a given file key', async () => {
      const key = 'mockedFileName1234.ext';
      const expectedUrl =
        'https://test-bucket.s3.test-region.amazonaws.com/mockedFileName1234.ext';

      const result = await service.getFileUrl(key);
      expect(result).toBe(expectedUrl);
    });
  });

  describe('deleteFile', () => {
    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should delete a file from S3 and return a success message', async () => {
      const key = 'mockedId.ext';

      // s3Client.send = jest.fn().mockImplementation((command) => {
      //   expect(command).toBeInstanceOf(DeleteObjectCommand);
      // });

      jest.spyOn(s3Client, 'send').mockImplementation((command) => {
        expect(command).toBeInstanceOf(DeleteObjectCommand);
      });

      const result = await service.deleteFile(key);
      expect(result).toEqual({ message: 'File deleted successfully' });
    });

    it('should throw InternalServerErrorException on S3 delete failure', async () => {
      const key = 'mockedId.ext';

      jest
        .spyOn(s3Client, 'send')
        .mockRejectedValue(new Error('S3 delete error') as never);

      await expect(service.deleteFile(key)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });
});

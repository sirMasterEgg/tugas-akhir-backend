import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { customAlphabet } from 'nanoid';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { FileType } from '../helpers/file-type';

@Injectable()
export class FileService {
  private uploadPath = this.configService.get<string>('UPLOAD_PATH');
  private dest = this.uploadPath;

  private client: S3Client;
  private bucketName = this.configService.get('S3_BUCKET_NAME');
  private s3_region = this.configService.get('S3_REGION');

  constructor(private configService: ConfigService) {
    if (!this.s3_region) {
      throw new Error('S3_REGION not found in environment variables');
    }

    this.client = new S3Client({
      region: this.s3_region,
      credentials: {
        accessKeyId: this.configService.get('S3_ACCESS_KEY'),
        secretAccessKey: this.configService.get('S3_SECRET_ACCESS_KEY'),
      },
      forcePathStyle: true,
    });
  }

  async saveFile(file: Express.Multer.File | Buffer): Promise<string> {
    try {
      if (file instanceof Buffer) {
        return await this.storeFileAws(file, this.bucketName);
      }

      return await this.storeFileAws(file.buffer, this.bucketName);
    } catch (e) {
      throw e;
    }
  }

  async storeFileAws(file: Buffer, bucketName: string) {
    try {
      const { ext, mime } = await FileType.fromBuffer(file);

      const newName = customAlphabet('1234567890abcdef', 16)();
      const fileName = `${newName}.${ext}`;

      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: fileName,
        Body: file,
        ContentType: mime,
        ACL: 'public-read',
      });

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const uploadResult = await this.client.send(command);

      return this.getFileUrl(fileName);
    } catch (e) {
      throw new InternalServerErrorException(e);
    }
  }
  async getFileUrl(key: string) {
    return `https://${this.bucketName}.s3.${this.s3_region}.amazonaws.com/${key}`;
  }
  async deleteFile(key: string) {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.client.send(command);

      return { message: 'File deleted successfully' };
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }
}

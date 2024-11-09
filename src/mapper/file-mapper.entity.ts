import { ConfigService } from '@nestjs/config';
import { FilesReference } from '../user/entities/files-reference.entity';

export interface Files
  extends Omit<FilesReference, 'createdAt' | 'question' | 'fileName'> {
  url: string;
}

export class FileMapper implements Files {
  private static configService: ConfigService = new ConfigService();

  id: string;
  url: string;
  fileName: string;

  static toUrl(id: string): string {
    return `${this.configService.get<string>('BACKEND_URL')}/api/attachment/${id}`;
  }

  static fromFile(file: FilesReference): Files {
    return {
      id: file.id,
      url: file.fileName,
    };
  }

  static fromFileList(files: FilesReference[]): Files[] {
    return files.map((file) => this.fromFile(file));
  }
}

import { FileValidator } from '@nestjs/common';
import { IFile } from '@nestjs/common/pipes/file/interfaces';
import * as sizeOf from 'image-size';

export class ImageDimensionValidator extends FileValidator {
  protected readonly validationOptions: Record<string, any>;

  isValid(
    file?: IFile[] | Record<string, IFile[]> | IFile,
  ): boolean | Promise<boolean> {
    const { width, height } = sizeOf.imageSize(file['buffer']);

    return this.validationOptions['ratio'] === width / height;
  }

  buildErrorMessage(): string {
    return 'Image ratio must be 1:1';
  }
}

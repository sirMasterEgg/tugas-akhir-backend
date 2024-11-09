import stream from 'node:stream';

export class FileType {
  private static async allMethod(): Promise<typeof import('file-type')> {
    return await (eval(`import('file-type')`) as Promise<
      typeof import('file-type')
    >);
  }

  static async fromBuffer(buffer: Uint8Array | ArrayBuffer) {
    const { fileTypeFromBuffer } = await this.allMethod();
    return fileTypeFromBuffer(buffer);
  }

  static async fromStream(stream: stream.Readable) {
    const { fileTypeFromStream } = await this.allMethod();
    return fileTypeFromStream(stream);
  }
}

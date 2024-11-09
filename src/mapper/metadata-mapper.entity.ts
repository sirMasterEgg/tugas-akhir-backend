export interface MetadataDto {
  currentPage: number;
  nextPage: number;
  totalPage: number;
}
type MetaDto = {
  page: number;
  totalPage: number;
};

export class MetadataMapper implements MetadataDto {
  currentPage: number;
  nextPage: number;
  totalPage: number;

  static fromMetadata(metadata: MetaDto): MetadataDto {
    return {
      currentPage: metadata.page,
      nextPage: metadata.page >= metadata.totalPage ? null : metadata.page + 1,
      totalPage: metadata.totalPage < 1 ? 1 : metadata.totalPage,
    };
  }
}

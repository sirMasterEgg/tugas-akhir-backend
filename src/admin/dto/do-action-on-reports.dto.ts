export class DoActionOnReportsDto {
  action: 'ban' | 'warn' | 'timeout' | 'reject';
  reportId: string;
}

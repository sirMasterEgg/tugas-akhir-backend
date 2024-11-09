export class DoActionOnUsersDto {
  action: 'ban' | 'warn' | 'timeout' | 'unban';
  userId: string;
}

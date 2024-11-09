export class CreatePostWDto {
  userId: string;
  groupId: string;
  anonymous: boolean;
  content: string;
  files?: string[];
}

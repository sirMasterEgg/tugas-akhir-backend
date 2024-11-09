import { Notification } from '../../entities/notification.entity';
import { MetadataDto } from '../../../mapper/metadata-mapper.entity';

export class GetNotificationResponseDto {
  notifications: Notification[];
  meta: MetadataDto;
}

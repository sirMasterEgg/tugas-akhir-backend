import { Notification } from '../../user/entities/notification.entity';

export class NotificationObserverDto {
  room: string[];
  notification: Pick<Notification, 'title' | 'message'>;

  constructor({
    room,
    notification,
  }: {
    room: string[];
    notification: Pick<Notification, 'title' | 'message'>;
  }) {
    this.room = room;
    this.notification = notification;
  }

  // Method for Admin Warning Notification
  static forAdminWarning({
    room,
    adminMessage,
  }: {
    room: string[];
    adminMessage: string;
  }) {
    return new NotificationObserverDto({
      room,
      notification: {
        title: 'Account Warning from Admin',
        message: `Hello, your account has received a message from admins: ${adminMessage}. Please be polite to avoid future violations.`,
      },
    });
  }

  // Method for New Follower Notification
  static forNewFollower({
    room,
    followerUsername,
  }: {
    room: string[];
    followerUsername: string;
  }) {
    return new NotificationObserverDto({
      room,
      notification: {
        title: 'You Have a New Follower!',
        message: `Congratulations! ${followerUsername} has started following you. Check out their profile to see their latest activity.`,
      },
    });
  }

  // Method for Personal Question Notification
  static forPersonalQuestion({
    room,
    askerUsername,
    question,
  }: {
    room: string[];
    askerUsername: string;
    question: string;
  }) {
    return new NotificationObserverDto({
      room,
      notification: {
        title: 'New Question for You',
        message: `${askerUsername} has asked you a question: '${question}'. Don't forget to provide your best answer!`,
      },
    });
  }

  // Method for Group Question Notification
  static forGroupQuestion({
    room,
    groupName,
    askerUsername,
    question,
  }: {
    room: string[];
    groupName: string;
    askerUsername: string;
    question: string;
  }) {
    return new NotificationObserverDto({
      room,
      notification: {
        title: `New Question in ${groupName}`,
        message: `There’s a new question from ${askerUsername} in the ${groupName} group: '${question}'. Check it out and share your thoughts!`,
      },
    });
  }

  // Method for New Answer Notification
  static forNewAnswer({
    room,
    responderUsername,
    answer,
  }: {
    room: string[];
    responderUsername: string;
    answer: string;
  }) {
    return new NotificationObserverDto({
      room,
      notification: {
        title: 'New Answer to Your Question',
        message: `${responderUsername} has answered your question: '${answer}'. Visit the discussion to see the full response.`,
      },
    });
  }
}

export class GroupPostNotificationObserverDto extends NotificationObserverDto {
  constructor({
    room,
    groupName,
    from,
  }: {
    room: string[];
    groupName: string;
    from: string;
  }) {
    super({
      room,
      notification: {
        title: 'Group Post',
        message: `${from} post in group ${groupName}`,
      },
    });
  }
}

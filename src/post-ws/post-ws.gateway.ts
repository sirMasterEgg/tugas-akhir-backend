import {
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { PostWsService } from './post-ws.service';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { WsMessage } from './enums/ws-message.enum';
import { CreatePostWDto } from './dto/create-post-w.dto';
import { CurrentUser } from '../current-user/current-user.decorator';
import { User } from '../user/entities/user.entity';
import { AuthWithRoles } from 'src/auth/auth.decorator';

@WebSocketGateway(3001, {
  cors: {
    origin: '*',
  },
  maxHttpBufferSize: 2e7,
})
@AuthWithRoles('user')
export class PostWsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;
  private logger = new Logger(PostWsGateway.name);
  private clients = new Map<string, string>();

  constructor(private readonly postWsService: PostWsService) {}

  afterInit(server: Server): any {
    this.logger.log('Socket Initialized');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  handleConnection(client: Socket, ...args: any[]): any {
    this.logger.log('Client ' + client.id + ' connected');
  }

  handleDisconnect(client: Socket): any {
    this.logger.log('Client ' + client.id + ' disconnected');
  }

  @SubscribeMessage(WsMessage.FETCH_POSTS)
  async create(
    @CurrentUser() user: User,
    @MessageBody() createPostWDto: CreatePostWDto,
  ) {
    const result = await this.postWsService.askQuestion(user, createPostWDto);
    this.server.emit(WsMessage.FETCH_POSTS, result);
    return result;
  }

  @SubscribeMessage('join')
  async handleJoin(client: Socket, room: string) {
    client.join(room);
    this.logger.log(`Client joined room: ${room}`);
  }

  @SubscribeMessage('leave')
  handleLeave(client: Socket, room: string) {
    client.leave(room);
    this.logger.log(`Client leave room: ${room}`);
  }
}

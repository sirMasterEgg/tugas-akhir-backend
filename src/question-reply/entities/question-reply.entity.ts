import {
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Question } from '../../user/entities/question.entity';
import { User } from '../../user/entities/user.entity';

@Entity('question-replies')
export class QuestionReply {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    nullable: false,
  })
  content: string;

  @Column({
    nullable: false,
  })
  anonymous: boolean;

  @ManyToOne(() => Question, (question) => question.replies)
  question: Question;

  @ManyToOne(() => User, (user) => user.replies)
  owner: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({
    type: 'bigint',
    default: 0,
  })
  vote: number;

  @ManyToMany(() => User, (user) => user.upvotedReplies)
  @JoinTable({
    name: 'upvoters-replies',
    joinColumn: {
      name: 'replyId',
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'userId',
      referencedColumnName: 'id',
    },
  })
  upvoters: User[];
}

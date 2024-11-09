import {
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';
import { FilesReference } from './files-reference.entity';
import { Group } from '../../group/entities/group.entity';
import { QuestionReply } from '../../question-reply/entities/question-reply.entity';

@Entity('questions')
export class Question {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'text',
    nullable: false,
  })
  question: string;

  @Column({
    type: 'boolean',
    nullable: false,
    default: false,
  })
  anonymous: boolean;

  @OneToMany(() => FilesReference, (filesReference) => filesReference.question)
  files: FilesReference[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User, (user) => user.questions)
  owner: User;

  @ManyToOne(() => Group, (group) => group.questions, {
    eager: true,
    nullable: true,
  })
  targetGroup?: Group;

  @ManyToOne(() => User, (user) => user.questionsToThisUser, {
    eager: true,
    nullable: true,
  })
  targetUser?: User;

  @OneToMany(() => QuestionReply, (questionReply) => questionReply.question)
  replies: QuestionReply[];

  @Column({
    type: 'bigint',
    default: 0,
  })
  vote: number;

  @ManyToMany(() => User, (user) => user.upvotedQuestions)
  @JoinTable({
    name: 'upvoters-questions',
    joinColumn: {
      name: 'questionId',
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'userId',
      referencedColumnName: 'id',
    },
  })
  upvoters: User[];
}

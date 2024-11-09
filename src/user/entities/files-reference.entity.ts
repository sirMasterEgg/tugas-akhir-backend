import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Question } from './question.entity';

@Entity('files-reference')
export class FilesReference {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'text',
    nullable: false,
  })
  fileName: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => Question, (question) => question.files)
  question: Question;
}

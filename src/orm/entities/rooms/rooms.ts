import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { CreateDateColumn } from 'typeorm';

import { Movie } from '../movie/movie';
import { Users } from '../users/users';

@Entity('rooms')
export class Rooms {
  @PrimaryGeneratedColumn()
  id: number;

  @CreateDateColumn()
  created_at: Date;

  @Column({
    type: 'boolean',
    default: true,
    name: 'is_active',
    nullable: false,
  })
  is_active: boolean;

  @ManyToOne(() => Movie, (movie) => movie.rooms)
  @JoinColumn({ name: 'movie_id' })
  movie: Movie;

  @ManyToOne(() => Users, (user) => user.rooms)
  @JoinColumn({ name: 'host_id' })
  host: Users;
}

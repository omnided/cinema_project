import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToMany,
  JoinColumn,
  JoinTable,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { OneToMany } from 'typeorm';

import { Genre } from '../genre/genre';
import { Rooms } from '../rooms/rooms';

@Entity('movie')
export class Movie {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    name: 'title',
    nullable: false,
  })
  title: string;

  @Column({
    name: 'country',
    nullable: true,
  })
  country?: string;

  @Column({
    name: 'description',
    nullable: false,
  })
  description: string;

  @Column({
    name: 'release_date',
    nullable: true,
  })
  release_date?: Date;

  @Column({
    type: 'varchar',
    name: 'video_url',
  })
  video_url: string;

  @Column({
    type: 'integer',
    name: 'duration_seconds',
    nullable: true,
  })
  duration_seconds?: number;

  @Column({
    name: 'poster_url',
    nullable: true,
  })
  poster_url?: string;

  @OneToMany(() => Rooms, (room) => room.movie)
  rooms: Rooms[];

  @ManyToMany(() => Genre, (genre) => genre.movies)
  @JoinTable({
    name: 'movie_genres_link',
    joinColumn: { name: 'movie_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'genre_id', referencedColumnName: 'id' },
  })
  genres: Genre[];
}

import bcrypt from 'bcryptjs';
import { Entity, PrimaryGeneratedColumn, Column, Check, OneToMany, CreateDateColumn, BeforeInsert } from 'typeorm';

import { Rooms } from '../rooms/rooms';

import { UserRole } from './types';

@Entity('users')
@Check(`"email" ~* '^[A-Za-z0-9._+%-]+@[A-Za-z0-9.-]+\\.[A-Za-z]+$'`)
export class Users {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'username', length: 20, unique: true })
  username: string;

  @Column({ length: 40, unique: true, name: 'email' })
  email: string;

  @Column({ length: 100, name: 'password_hash' })
  password_hash: string;

  @Column({ length: 30, name: 'role', default: 'User' })
  role: UserRole;

  @Column({ type: 'text', name: 'refresh_token', nullable: true, unique: true })
  refresh_token?: string;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @OneToMany(() => Rooms, (room) => room.host)
  rooms: Rooms[];

  @BeforeInsert()
  async hashPassword() {
    const saltRounds = 10;
    this.password_hash = await bcrypt.hash(this.password_hash, saltRounds);
  }
}

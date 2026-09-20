import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getRepository, Repository } from 'typeorm';

import { Users } from 'orm/entities/users/users';
import { JwtPayload } from 'types/JwtPayload';
import { createJwtToken } from 'utils/createJwtToken';
import { createRefJwtToken } from 'utils/createRefJwtToken';
import { CustomError } from 'utils/response/custom-error/CustomError';

export class UserService {
  constructor(private userRepository: Repository<Users>) {}

  private buildJwtPayload(user: Users): JwtPayload {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    };
  }

  async findAll(): Promise<Users[]> {
    return this.userRepository.find();
  }

  async findById(id: number): Promise<Users> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new CustomError(404, 'General', `User with id:${id} not found.`);
    }
    return user;
  }

  public async register(email: string, username: string, plainPassword: string) {
    const existingUser = await this.userRepository.findOne({ where: { email } });
    if (existingUser) {
      throw new Error('Пользователь с таким email уже существует');
    }

    const newUser = new Users();
    newUser.username = username;
    newUser.email = email;
    newUser.password_hash = await bcrypt.hash(plainPassword, 10);
    newUser.role = 'User' as const;

    await this.userRepository.save(newUser);

    const payload: JwtPayload = this.buildJwtPayload(newUser);
    const token = createJwtToken(payload);
    const refresh_token = createRefJwtToken(payload);

    const { password_hash, ...safeUser } = newUser;

    return { user: safeUser, token, refresh_token };
  }

  public async login(email: string, plainPasswordFromUser: string) {
    // 1. Ищем пользователя по email
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      throw new Error('Пользователь не найден');
    }

    // 2. Сравниваем введенный пароль с хешем из базы
    // bcrypt.compare сам понимает, как расшифровать соль и сверить хеши
    const isPasswordValid = await bcrypt.compare(plainPasswordFromUser, user.password_hash);

    if (!isPasswordValid) {
      throw new Error('Неверный логин или пароль');
    }

    const payload: JwtPayload = this.buildJwtPayload(user);

    // 3. Пароль верный! Генерируем JWT (как мы писали ранее)
    const token = createJwtToken(payload);
    const refresh_token = createRefJwtToken(payload);

    // 4. Возвращаем токен и данные пользователя (без пароля)
    const { password_hash, ...safeUser } = user;
    return { user: safeUser, token, refresh_token };
  }

  async updateRefreshToken(RefreshToken: string) {
    try {
      jwt.verify(RefreshToken, process.env.REFJWT_SECRET as string);
    } catch (error) {
      throw new CustomError(
        401,
        'Unauthorized',
        'Refresh токен протух или недействителен. Требуется повторная авторизация.',
      );
    }

    const tokenInDb = await this.userRepository.findOne({ where: { refresh_token: RefreshToken } });

    if (!tokenInDb) {
      throw new CustomError(401, 'Unauthorized', 'Токен не найден в базе (возможно, уже был использован или отозван).');
    }
    const payload = this.buildJwtPayload(tokenInDb);
    const newAccessToken = createJwtToken(payload);
    const newRefreshToken = createRefJwtToken(payload);

    await this.userRepository.update(tokenInDb.id, { refresh_token: newRefreshToken });

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  }

  public async update(
    id: number,
    userData: Partial<{ username: string; name: string; email: string; password: string; role: string }>,
  ): Promise<Users | undefined> {
    const existingUser = await this.userRepository.findOne({ where: { id } });
    if (!existingUser) {
      throw new CustomError(404, 'General', `User with id:${id} not found.`);
    }
    await this.userRepository.update(id, userData as Partial<Users>);
    const updatedUser = await this.userRepository.findOne({ where: { id } });
    if (!updatedUser) {
      throw new CustomError(404, 'General', `User with id:${id} not found after update.`);
    }
    return updatedUser;
  }

  public async delete(id: number): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new CustomError(404, 'General', `User with id:${id} not found.`);
    }
    await this.userRepository.remove(user);
  }
}

export default UserService;

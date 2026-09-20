import { getRepository } from 'typeorm';

import { AuthController } from 'controllers/auth/AuthController';
import { MovieController } from 'controllers/movie/MovieController';
import { VideoController } from 'controllers/video/videoController';
import { Movie } from 'orm/entities/movie/movie';
import { Users } from 'orm/entities/users/users';
import { MovieService } from 'service/MovieService';
import { UserService } from 'service/UserService';
import { VideoService } from 'service/VideoService';

const movieRepository = getRepository(Movie);
const userRepository = getRepository(Users);

const videoService = new VideoService(movieRepository);
const movieService = new MovieService(movieRepository);
const userService = new UserService(userRepository);

export const movieController = new MovieController(movieService);
export const videoController = new VideoController(videoService);
export const userController = new AuthController(userService);

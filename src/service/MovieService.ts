import { Repository } from 'typeorm';

import { CreateMovieDto, UpdateMovieDto } from 'dto/movieDto';
import { Genre } from 'orm/entities/genre/genre';
import { Movie } from 'orm/entities/movie/movie';
import { CustomError } from 'utils/response/custom-error/CustomError';

export class MovieService {
  constructor(private movieRepository: Repository<Movie>) {}
  public async findAll(): Promise<Movie[]> {
    const allMovies = await this.movieRepository.find({ relations: ['genres'] });
    if (!allMovies || allMovies.length === 0) {
      throw new CustomError(404, 'General', 'No movies found.');
    }
    return allMovies;
  }
  public async findById(id: number): Promise<Movie> {
    const movie = await this.movieRepository.findOne({ where: { id }, relations: ['genres'] });
    if (!movie) {
      throw new CustomError(404, 'General', `Movie with id:${id} not found.`);
    }
    return movie;
  }
  public async create(movieData: CreateMovieDto): Promise<Movie> {
    const { genres, ...movieDetails } = movieData;

    const movie = this.movieRepository.create(movieDetails);

    if (genres && genres.length > 0) {
      movie.genres = genres.map((id) => ({ id } as Genre)); // [1,2,3] => [{id:1}, {id:2}, {id:3}]
    }
    try {
      return await this.movieRepository.save(movie);
    } catch (error: any) {
      if (error.code === '23505') {
        throw new CustomError(409, 'General', 'Фильм с таким названием уже существует.');
      }

      if (error.code === '22001') {
        throw new CustomError(400, 'Validation', 'Слишком длинное описание фильма.');
      }

      console.error('Database Error:', error);
      throw new CustomError(500, 'Raw', 'Не удалось сохранить фильм.');
    }
  }
  public async update(id: number, movieData: Partial<UpdateMovieDto>): Promise<Movie> {
    const existingMovie = await this.movieRepository.findOne({ where: { id } });

    if (!existingMovie) {
      throw new CustomError(404, 'General', `Movie with id:${id} not found.`);
    }

    const { genres, ...movieDetails } = movieData;

    if (genres !== undefined) {
      existingMovie.genres = genres.map((id) => ({ id } as Genre));
    }

    Object.assign(existingMovie, movieDetails);

    try {
      return await this.movieRepository.save(existingMovie);
    } catch (error: any) {
      if (error.code === '23505') {
        throw new CustomError(409, 'General', 'Фильм с таким названием уже существует.');
      }
      if (error.code === '22001') {
        throw new CustomError(400, 'Validation', 'Слишком длинное описание фильма.');
      }
      console.error('Database Error:', error);
      throw new CustomError(500, 'Raw', 'Не удалось обновить фильм.');
    }
  }

  public async delete(id: number): Promise<void> {
    const movie = await this.movieRepository.findOne({ where: { id } });
    if (!movie) {
      throw new CustomError(404, 'General', `Movie with id:${id} not found.`);
    }
    await this.movieRepository.remove(movie);
  }
}

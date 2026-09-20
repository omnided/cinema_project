import { Request, Response, NextFunction } from 'express';

import { CreateMovieDto } from 'dto/movieDto';
import { MovieService } from 'service/MovieService';

export class MovieController {
  constructor(private movieService: MovieService) {}
  public findAllMovies = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const movies = await this.movieService.findAll();
      res.customSuccess(200, 'Movies retrieved successfully', movies);
    } catch (error) {
      next(error);
    }
  };
  public findMovieById = async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    try {
      const movie = await this.movieService.findById(Number(id));
      res.customSuccess(200, 'Movie retrieved successfully', movie);
    } catch (error) {
      next(error);
    }
  };

  public createMovie = async (
    req: Request<Record<string, never>, unknown, CreateMovieDto>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const newMovie = await this.movieService.create(req.body);
      res.customSuccess(201, 'Movie created successfully', newMovie);
    } catch (error) {
      next(error);
    }
  };

  public updateMovie = async (
    req: Request<{ id: string }, unknown, Partial<CreateMovieDto>>,
    res: Response,
    next: NextFunction,
  ) => {
    const { id } = req.params;
    try {
      const updatedMovie = await this.movieService.update(Number(id), req.body);
      res.customSuccess(200, 'Movie updated successfully', updatedMovie);
    } catch (error) {
      next(error);
    }
  };
}

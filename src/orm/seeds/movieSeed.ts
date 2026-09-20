import { MigrationInterface, QueryRunner, getRepository } from 'typeorm';

import { Movie } from '../entities/movie/movie';

export class SeedMovies1590519635401 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    const movie = new Movie();
    const movieRepository = getRepository(Movie);

    movie.title = 'Superperci';
    movie.description =
      "A high school chemistry teacher diagnosed with cancer turns to manufacturing and selling methamphetamine in order to secure his family's future.";
    movie.video_url = 'pending';
    movie.duration_seconds = 0;
    movie.poster_url = 'none';
    await movieRepository.save(movie);
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    console.log('Not implemented');
  }
}

export interface CreateMovieDto {
  genres: number[];
  title: string;
  country?: string | undefined;
  description: string;
  release_date?: Date | undefined;
  video_url: string;
  duration_seconds?: number | undefined;
  poster_url?: string | undefined;
}

export interface UpdateMovieDto {
  genres?: number[];
  title?: string;
  country?: string | undefined;
  description?: string;
  release_date?: Date | undefined;
  video_url?: string;
  duration_seconds?: number | undefined;
  poster_url?: string | undefined;
}

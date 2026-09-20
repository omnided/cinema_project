import fs from 'fs';
import path from 'path';

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import ffmpeg from 'fluent-ffmpeg';
import { getRepository, Repository } from 'typeorm';

import { Movie } from '../orm/entities/movie/movie'; // Твоя сущность

export class VideoService {
  constructor(private movieRepository: Repository<Movie>) {}
  private static s3Client = new S3Client({
    region: 'us-east-1',
    endpoint: process.env.S3_ENDPOINT,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY || '',
      secretAccessKey: process.env.S3_SECRET_KEY || '',
    },
  });

  private static bucketName = 'my-cinema-bucket';

  async processAndUploadMovie(movieId: number, rawFilePath: string) {
    const hlsOutputDir = path.join(__dirname, '../../tmp/hls', String(movieId));

    try {
      if (!fs.existsSync(hlsOutputDir)) {
        fs.mkdirSync(hlsOutputDir, { recursive: true });
      }

      console.log('Начинаем нарезку видео...');
      await this.convertToHls(rawFilePath, hlsOutputDir);

      console.log('Начинаем загрузку в облако...');
      const playlistUrl = await VideoService.uploadDirectoryToS3(hlsOutputDir, `movies/${movieId}`);
      // const playlistUrl = `http://localhost:4000/movies/${movieId}/playlist.m3u8`;

      await this.movieRepository.update(movieId, { video_url: playlistUrl });
      console.log(`Успех! Ссылка на фильм: ${playlistUrl}`);

      return playlistUrl;
    } catch (error) {
      console.error('Ошибка в конвейере видео:', error);
      throw error;
    } finally {
      console.log('Удаляем временные файлы...');
      fs.rmSync(rawFilePath, { force: true });
      fs.rmSync(hlsOutputDir, { recursive: true, force: true });
    }
  }

  private convertToHls(inputPath: string, outputDir: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const outputPlaylist = path.join(outputDir, 'playlist.m3u8');

      ffmpeg(inputPath)
        .videoCodec('libx264')
        .audioCodec('aac')
        .addOptions([
          '-profile:v baseline',
          '-level 3.0',
          '-start_number 0',
          '-hls_time 10',
          '-hls_list_size 0',
          '-f hls',
        ])
        .output(outputPlaylist)
        .on('end', () => resolve())
        .on('error', (err) => reject(err))
        .run();
    });
  }

  private static async uploadDirectoryToS3(dirPath: string, s3Folder: string): Promise<string> {
    const files = fs.readdirSync(dirPath);
    let playlistUrl = '';

    // 1. Превращаем массив имен файлов в массив асинхронных задач (Промисов)
    const uploadPromises = files.map(async (file) => {
      const filePath = path.join(dirPath, file);
      const fileStream = fs.createReadStream(filePath);
      const s3Key = `${s3Folder}/${file}`;

      const contentType = file.endsWith('.m3u8') ? 'application/x-mpegURL' : 'video/MP2T';

      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: s3Key,
        Body: fileStream,
        ContentType: contentType,
      });

      // Отправляем файл в MinIO
      await this.s3Client.send(command);

      // Если это главный плейлист, сохраняем его URL
      if (file === 'playlist.m3u8') {
        const baseUrl = process.env.S3_PUBLIC_URL || 'http://localhost:9000';
        playlistUrl = `${baseUrl}/${this.bucketName}/${s3Key}`;
      }
    });

    // 2. Ждем завершения загрузки ВСЕХ файлов параллельно
    await Promise.all(uploadPromises);

    return playlistUrl;
  }
}

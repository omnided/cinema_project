import { Request, Response, NextFunction } from 'express';

import { VideoService } from 'service/VideoService';
import { CustomError } from 'utils/response/custom-error/CustomError';

export class VideoController {
  constructor(private videoService: VideoService) {}
  public VideoFfmpeg = async (req: Request, res: Response, next: NextFunction) => {
    const { videoId } = req.params;
    const { rawFilePath } = req.body;

    if (!rawFilePath) {
      return next(new CustomError(400, 'Validation', 'rawFilePath is required'));
    }

    try {
      const video = await this.videoService.processAndUploadMovie(Number(videoId), rawFilePath);
      res.customSuccess(200, 'Video processed and uploaded successfully', video);
    } catch (error) {
      next(error);
    }
  };
}

import { Router } from 'express';

import { checkJwt } from 'middleware/checkJwt';
import { checkRole } from 'middleware/checkRole';

import { videoController } from '../../../dependencies';

const router = Router();

// Мы используем метод POST, так как передаем данные в req.body
// Символ двоеточия (:) означает, что videoId — это динамическая переменная
router.post('/process/:videoId', [checkJwt, checkRole(['Admin']), videoController.VideoFfmpeg]);

export default router;

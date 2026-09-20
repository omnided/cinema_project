import { Router } from 'express';

import { movieController } from '../../../dependencies';
import { checkJwt } from '../../../middleware/checkJwt';
import { checkRole } from '../../../middleware/checkRole';

const router = Router();

router.post('/process/:videoId', [checkJwt, checkRole(['Admin']), movieController.createMovie]);
router.get('/process/:videoId', movieController.findMovieById);
router.get('/process/:videoId', movieController.findAllMovies);

export default router;

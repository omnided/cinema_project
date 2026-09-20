import { Router } from 'express';

import page404 from './pages/404';
import pageRoot from './pages/root';
import auth from './v1/auth/auth';
import movie from './v1/movie/movie';
import video from './v1/video/video';

const router = Router();

router.use('/movie', movie);
router.use('/video', video);
router.use('/auth', auth);
router.use(pageRoot);
router.use(page404);

export default router;

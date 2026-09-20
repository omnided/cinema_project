import { Router } from 'express';

import { userController } from '../../../dependencies';

const router = Router();

router.post('/login', userController.login);
router.post('/register', userController.register);
router.post('/refresh-token', userController.refreshToken);

export default router;

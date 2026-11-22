import express from 'express';
import { verifyUserOrStaffAuth } from '../../middleware/auth';

const router = express.Router();

router.get('/api/auth/session', verifyUserOrStaffAuth, (req, res) => {
  const user = (req as any).user;
  res.json({
    success: true,
    user: {
      uid: user.uid,
      email: user.email,
      emailVerified: Boolean(user.emailVerified),
      role: user.role,
      isStaff: Boolean(user.isStaff),
    },
  });
});

export default router;

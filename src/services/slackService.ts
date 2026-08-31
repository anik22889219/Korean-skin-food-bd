import { SlackUser, SlackPermission, SlackRole } from '../types';
import { db, sanitizeForFirestore } from './firebase';
import { collection, doc, getDoc, getDocs, setDoc, deleteDoc } from 'firebase/firestore';

type SlackApp = any;
type SlackReceiver = any;

// In-memory cache with TTL for ultra-fast permission checks
const slackUserCache = new Map<string, { user: SlackUser; timestamp: number }>();
const CACHE_TTL_MS = 60 * 1000; // 1 minute

// Default permission mapping based on roles
export const DEFAULT_ROLE_PERMISSIONS: Record<SlackRole, SlackPermission[]> = {
  super_admin: ['admin:all', 'orders:read', 'orders:write', 'inventory:read', 'inventory:write', 'users:manage', 'reports:view'],
  admin: ['admin:all', 'orders:read', 'orders:write', 'inventory:read', 'inventory:write', 'users:manage', 'reports:view'],
  inventory_manager: ['inventory:read', 'inventory:write', 'orders:read', 'reports:view'],
  customer: []
};

// Initial demo seed mappings to guarantee instant readiness
const INITIAL_SLACK_USERS: SlackUser[] = [
  {
    slackUserId: 'U_ADMIN_01',
    firestoreUserId: 'staff-admin-01',
    email: 'koreanskinfood.bd@gmail.com',
    role: 'super_admin',
    permissions: DEFAULT_ROLE_PERMISSIONS.super_admin,
    slackUsername: 'admin_ksf',
    slackTeamId: 'T_KSF_BD',
    name: 'Korean Skin Food Super Admin',
    linkedAt: new Date().toISOString()
  },
  {
    slackUserId: 'U_INV_MGR',
    firestoreUserId: 'staff-inv-02',
    email: 'inventory@koreanskinfood.bd',
    role: 'inventory_manager',
    permissions: DEFAULT_ROLE_PERMISSIONS.inventory_manager,
    slackUsername: 'inventory_lead',
    slackTeamId: 'T_KSF_BD',
    name: 'Stock & Warehouse Manager',
    linkedAt: new Date().toISOString()
  }
];

// Initialize Slack Bolt Receiver safely
let receiver: SlackReceiver | null = null;
let slackApp: SlackApp | null = null;
let isInitialized = false;

export async function initializeSlackSDK() {
  if (typeof window !== 'undefined') return null; // Browser environment guard

  const botToken = process.env.SLACK_BOT_TOKEN;
  const signingSecret = process.env.SLACK_SIGNING_SECRET;

  if (botToken && signingSecret && botToken !== '' && signingSecret !== '') {
    try {
      const packageName = '@slack/bolt';
      const boltModule = await import(/* @vite-ignore */ packageName);
      const { App, ExpressReceiver } = boltModule;

      receiver = new ExpressReceiver({
        signingSecret,
        endpoints: '/slack/events',
        processBeforeResponse: true,
      });

      slackApp = new App({
        token: botToken,
        receiver,
      });

      // Register default event and command handlers for Slack Foundation
      slackApp.command('/ksf-status', async ({ command, ack, respond }) => {
        await ack();
        const verifyResult = await slackService.verifyPermission(command.user_id, 'reports:view');
        if (!verifyResult.authorized) {
          await respond({
            response_type: 'ephemeral',
            text: `🚫 *Permission Denied*: ${verifyResult.reason}`
          });
          return;
        }

        await respond({
          response_type: 'in_channel',
          blocks: [
            {
              type: 'header',
              text: {
                type: 'plain_text',
                text: '⚡ Korean Skin Food BD — System Status'
              }
            },
            {
              type: 'section',
              fields: [
                { type: 'mrkdwn', text: `*User:* <@${command.user_id}> (${verifyResult.user?.role})` },
                { type: 'mrkdwn', text: `*Status:* 🟢 All backend systems operational` },
                { type: 'mrkdwn', text: `*Permissions:* \`${verifyResult.user?.permissions.join(', ')}\`` },
                { type: 'mrkdwn', text: `*Timestamp:* ${new Date().toLocaleString()}` }
              ]
            }
          ]
        });
      });

      // Register interactive action listener for button clicks
      slackApp.action(/action_.*/, async ({ action, body, ack, respond }: any) => {
        await ack();
        try {
          const actionId = action.action_id;
          const actionValue = action.value;
          const userId = body.user.id;
          const username = body.user.username || body.user.name;

          const { slackNotificationService } = await import('./slackNotificationService');
          const result = await slackNotificationService.handleSlackAction(actionId, actionValue, userId, username);

          if (result.success && result.updatedBlocks) {
            await respond({
              replace_original: true,
              blocks: result.updatedBlocks,
              text: result.message
            });
          } else {
            await respond({
              response_type: 'ephemeral',
              replace_original: false,
              text: `⚠️ ${result.message}`
            });
          }
        } catch (err: any) {
          console.error('Slack Bolt Action Handler Error:', err);
          await respond({
            response_type: 'ephemeral',
            replace_original: false,
            text: `❌ Error processing action: ${err.message}`
          });
        }
      });
    } catch (err) {
      console.warn('⚠️ Slack Bolt SDK initialization error, falling back to safe module mode:', err);
    }
  } else {
    console.log('ℹ️ SLACK_BOT_TOKEN or SLACK_SIGNING_SECRET not configured. Slack module running in safe API/Firestore mode.');
  }
}

export const slackService = {
  getReceiver() {
    return receiver;
  },

  getSlackApp() {
    return slackApp;
  },

  isSDKConfigured(): boolean {
    return isInitialized && !!slackApp;
  },

  getStatus() {
    return {
      sdkConfigured: this.isSDKConfigured(),
      botTokenSet: !!process.env.SLACK_BOT_TOKEN,
      signingSecretSet: !!process.env.SLACK_SIGNING_SECRET,
      appTokenSet: !!process.env.SLACK_APP_TOKEN,
      eventsEndpoint: '/api/slack/events'
    };
  },

  /**
   * Fetch Slack User document from Firestore or Cache
   */
  async getSlackUser(slackUserId: string): Promise<SlackUser | null> {
    if (!slackUserId) return null;

    // Check cache
    const cached = slackUserCache.get(slackUserId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.user;
    }

    // Try Firestore lookup if db available
    if (db) {
      try {
        const docRef = doc(db, 'slack_users', slackUserId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const u = docSnap.data() as SlackUser;
          slackUserCache.set(slackUserId, { user: u, timestamp: Date.now() });
          return u;
        }
      } catch (err) {
        console.warn(`Firestore getSlackUser error for ${slackUserId}:`, err);
      }
    }

    // Check initial seed list fallback
    const seeded = INITIAL_SLACK_USERS.find(u => u.slackUserId === slackUserId);
    if (seeded) {
      slackUserCache.set(slackUserId, { user: seeded, timestamp: Date.now() });
      return seeded;
    }

    return null;
  },

  /**
   * Fetch all linked Slack users
   */
  async getAllSlackUsers(): Promise<SlackUser[]> {
    const list: SlackUser[] = [];
    const seenIds = new Set<string>();

    if (db) {
      try {
        const snap = await getDocs(collection(db, 'slack_users'));
        snap.forEach(docSnap => {
          const u = docSnap.data() as SlackUser;
          list.push(u);
          seenIds.add(u.slackUserId);
        });
      } catch (err) {
        console.warn('Firestore getAllSlackUsers error:', err);
      }
    }

    // Include initial seed users if not already present
    for (const seed of INITIAL_SLACK_USERS) {
      if (!seenIds.has(seed.slackUserId)) {
        list.push(seed);
      }
    }

    return list;
  },

  /**
   * Link or update a Slack User ID to a Firestore Admin profile
   */
  async linkSlackUser(data: Omit<SlackUser, 'linkedAt'> & { linkedAt?: string }): Promise<SlackUser> {
    const permissions = data.permissions && data.permissions.length > 0 
      ? data.permissions 
      : (DEFAULT_ROLE_PERMISSIONS[data.role] || []);

    const slackUser: SlackUser = {
      slackUserId: data.slackUserId,
      firestoreUserId: data.firestoreUserId,
      email: data.email,
      role: data.role,
      permissions,
      slackUsername: data.slackUsername || '',
      slackTeamId: data.slackTeamId || 'T_KSF_BD',
      name: data.name || data.email.split('@')[0],
      linkedAt: data.linkedAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Update in-memory cache
    slackUserCache.set(slackUser.slackUserId, { user: slackUser, timestamp: Date.now() });

    // Save to Firestore
    if (db) {
      try {
        await setDoc(doc(db, 'slack_users', slackUser.slackUserId), sanitizeForFirestore(slackUser));
        console.log(`Successfully saved Slack user ${slackUser.slackUserId} to Firestore.`);
      } catch (err) {
        console.warn('Failed to save Slack user to Firestore:', err);
      }
    }

    return slackUser;
  },

  /**
   * Unlink a Slack user account
   */
  async unlinkSlackUser(slackUserId: string): Promise<boolean> {
    slackUserCache.delete(slackUserId);
    if (db) {
      try {
        await deleteDoc(doc(db, 'slack_users', slackUserId));
        return true;
      } catch (err) {
        console.warn(`Failed to delete Slack user ${slackUserId} from Firestore:`, err);
      }
    }
    return true;
  },

  /**
   * Verify permissions for a Slack User
   */
  async verifyPermission(
    slackUserId: string,
    requiredPermission: SlackPermission | SlackPermission[]
  ): Promise<{ authorized: boolean; user?: SlackUser; reason?: string }> {
    if (!slackUserId) {
      return { authorized: false, reason: 'Slack User ID is required' };
    }

    const slackUser = await this.getSlackUser(slackUserId);

    if (!slackUser) {
      return {
        authorized: false,
        reason: `Slack account (${slackUserId}) is not linked to any Firestore admin profile.`
      };
    }

    // Super Admin & Admin roles have master access
    if (slackUser.role === 'super_admin' || slackUser.role === 'admin' || slackUser.permissions.includes('admin:all')) {
      return { authorized: true, user: slackUser };
    }

    const requiredList = Array.isArray(requiredPermission) ? requiredPermission : [requiredPermission];
    const hasPermission = requiredList.some(req => slackUser.permissions.includes(req));

    if (hasPermission) {
      return { authorized: true, user: slackUser };
    }

    return {
      authorized: false,
      user: slackUser,
      reason: `Slack user (${slackUser.email}) with role '${slackUser.role}' lacks required permission: ${requiredList.join(', ')}`
    };
  },

  /**
   * Express Middleware helper to enforce Slack User permission verification
   */
  expressVerifyMiddleware(requiredPermission: SlackPermission | SlackPermission[]) {
    return async (req: any, res: any, next: any) => {
      const slackUserId = req.headers['x-slack-user-id'] || req.body?.slack_user_id || req.body?.slackUserId || req.query?.slack_user_id;

      if (!slackUserId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized: Missing x-slack-user-id header or body field.'
        });
      }

      const result = await slackService.verifyPermission(String(slackUserId), requiredPermission);

      if (!result.authorized) {
        return res.status(403).json({
          success: false,
          error: result.reason,
          slackUserId
        });
      }

      req.slackUser = result.user;
      next();
    };
  }
};

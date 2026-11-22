import express from 'express';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { verifyAdminAuth, verifyUserOrStaffAuth } from '../../middleware/auth';
import { validateImageBase64MagicBytes } from '../../utils/validators';
import { writeAuditLog } from '../../utils/auditLog';

const router = express.Router();

const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
const invoicesDir = path.join(uploadsDir, 'invoices');

try {
  if (!fs.existsSync(invoicesDir)) {
    fs.mkdirSync(invoicesDir, { recursive: true });
  }
} catch (err) {
  console.warn('[Media] Could not create invoices upload directory:', err);
}

router.post('/api/upload/invoice', verifyAdminAuth, async (req, res) => {
  try {
    const { dataUrl } = req.body;
    const check = validateImageBase64MagicBytes(dataUrl, 15 * 1024 * 1024);
    if ('error' in check) {
      return res.status(check.status).json({ success: false, error: check.error });
    }

    if (!fs.existsSync(invoicesDir)) {
      fs.mkdirSync(invoicesDir, { recursive: true });
    }

    const { ext, buffer } = check.data;
    const safeName = `invoice-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${ext}`;
    const filePath = path.join(invoicesDir, safeName);
    await fs.promises.writeFile(filePath, buffer);

    const publicUrl = `/uploads/invoices/${safeName}`;
    await writeAuditLog({
      action: 'INVOICE_IMAGE_UPLOADED',
      entityType: 'media',
      entityId: safeName,
      actorUid: (req as any).user?.uid,
      actorEmail: (req as any).user?.email,
      actorRole: (req as any).user?.role,
      details: { ext, sizeBytes: buffer.length },
    });

    return res.json({
      success: true,
      url: publicUrl,
      sizeBytes: buffer.length,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Failed to save invoice image' });
  }
});

router.get('/api/cloudinary/config', (_req, res) => {
  const cloudName = (process.env.CLOUDINARY_CLOUD_NAME || 'dxvmfaxeh').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  const uploadPreset = (process.env.CLOUDINARY_UPLOAD_PRESET || 'ml_default').trim();
  const hasApiKey = Boolean(process.env.CLOUDINARY_API_KEY);
  const hasSecret = Boolean(process.env.CLOUDINARY_API_SECRET);
  res.json({
    success: true,
    cloudName,
    uploadPreset,
    hasApiKey,
    hasServerSigning: hasApiKey && hasSecret,
    isConfigured: Boolean(cloudName && (hasSecret || uploadPreset)),
  });
});

router.post('/api/cloudinary/sign', verifyUserOrStaffAuth, (req, res) => {
  const cloudName = (process.env.CLOUDINARY_CLOUD_NAME || 'dxvmfaxeh').trim();
  const apiKey = process.env.CLOUDINARY_API_KEY || '';
  const apiSecret = process.env.CLOUDINARY_API_SECRET || '';
  const uploadPreset = (process.env.CLOUDINARY_UPLOAD_PRESET || 'ml_default').trim();
  const folder = String(req.body?.folder || 'kbeauty_uploads').replace(/[^a-zA-Z0-9/_-]/g, '');

  if (apiKey && apiSecret) {
    const timestamp = Math.floor(Date.now() / 1000);
    const paramsToSign: Record<string, string | number> = { folder, timestamp };
    const sorted = Object.keys(paramsToSign)
      .sort()
      .map((k) => `${k}=${paramsToSign[k]}`)
      .join('&');
    const signature = crypto
      .createHash('sha1')
      .update(sorted + apiSecret)
      .digest('hex');

    return res.json({
      success: true,
      configured: true,
      mode: 'signed',
      cloudName,
      apiKey,
      timestamp,
      signature,
      folder,
    });
  }

  if (uploadPreset) {
    return res.json({
      success: true,
      configured: true,
      mode: 'unsigned',
      cloudName,
      uploadPreset,
      folder,
    });
  }

  return res.json({
    success: false,
    configured: false,
    error: 'Cloudinary credentials not configured in server environment.',
  });
});

router.post('/api/cloudinary/upload-invoice', verifyAdminAuth, async (req, res) => {
  try {
    const { dataUrl, folder = 'kbeauty_invoices', cloudName: customCloudName, uploadPreset: customPreset } = req.body;
    const check = validateImageBase64MagicBytes(dataUrl, 15 * 1024 * 1024);
    if ('error' in check) {
      return res.status(check.status).json({ success: false, error: check.error });
    }

    const rawCloudName = customCloudName || process.env.CLOUDINARY_CLOUD_NAME || 'dxvmfaxeh';
    const cloudName = String(rawCloudName).trim().toLowerCase().replace(/[^a-z0-9]/g, '') || 'dxvmfaxeh';
    const apiKey = process.env.CLOUDINARY_API_KEY || '';
    const apiSecret = process.env.CLOUDINARY_API_SECRET || '';
    const defaultPreset = customPreset || process.env.CLOUDINARY_UPLOAD_PRESET || 'ml_default';
    const cleanFolder = String(folder).replace(/[^a-zA-Z0-9/_-]/g, '') || 'kbeauty_invoices';

    const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
    const bodyParams: Record<string, string> = {
      file: dataUrl,
      folder: cleanFolder,
    };

    if (apiKey && apiSecret) {
      const timestamp = String(Math.floor(Date.now() / 1000));
      bodyParams.timestamp = timestamp;
      bodyParams.api_key = apiKey;

      const paramsToSign: Record<string, string> = { folder: cleanFolder, timestamp };
      const stringToSign = Object.keys(paramsToSign)
        .sort()
        .map((k) => `${k}=${paramsToSign[k]}`)
        .join('&');
      bodyParams.signature = crypto.createHash('sha1').update(stringToSign + apiSecret).digest('hex');
    } else {
      bodyParams.upload_preset = defaultPreset;
    }

    const upstreamRes = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyParams),
    });

    const upstreamData: any = await upstreamRes.json();
    if (upstreamRes.ok && upstreamData.secure_url) {
      return res.json({
        success: true,
        secureUrl: upstreamData.secure_url,
        publicId: upstreamData.public_id,
        format: upstreamData.format,
        bytes: upstreamData.bytes,
        width: upstreamData.width,
        height: upstreamData.height,
        cloudName,
      });
    }

    return res.status(400).json({
      success: false,
      error: upstreamData.error?.message || 'Failed to upload invoice to Cloudinary',
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err?.message || 'Internal server error uploading to Cloudinary',
    });
  }
});

export { uploadsDir };
export default router;

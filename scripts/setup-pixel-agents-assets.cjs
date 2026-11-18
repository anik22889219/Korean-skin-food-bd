const fs = require('fs');
const path = require('path');
const os = require('os');
const { PNG } = require('G:/Korean Skin Food/Agent office/pixel-agents-main/node_modules/pngjs');

const TARGET_BASE = 'G:/Korean Skin Food/Agent office/korean-skin-food-assets';
const FURNITURE_DIR = path.join(TARGET_BASE, 'assets', 'furniture');

function resample(srcPng, targetW, targetH) {
  const dst = new PNG({ width: targetW, height: targetH });
  const scaleX = srcPng.width / targetW;
  const scaleY = srcPng.height / targetH;
  for (let y = 0; y < targetH; y++) {
    for (let x = 0; x < targetW; x++) {
      let r = 0, g = 0, b = 0, a = 0, count = 0;
      const x0 = Math.floor(x * scaleX);
      const x1 = Math.min(srcPng.width, Math.floor((x + 1) * scaleX));
      const y0 = Math.floor(y * scaleY);
      const y1 = Math.min(srcPng.height, Math.floor((y + 1) * scaleY));
      for (let sy = y0; sy < y1; sy++) {
        for (let sx = x0; sx < x1; sx++) {
          const idx = (sy * srcPng.width + sx) * 4;
          const sa = srcPng.data[idx + 3];
          if (sa > 15) {
            r += srcPng.data[idx] * (sa / 255);
            g += srcPng.data[idx + 1] * (sa / 255);
            b += srcPng.data[idx + 2] * (sa / 255);
            a += sa;
            count++;
          }
        }
      }
      const outIdx = (y * targetW + x) * 4;
      if (count > 0 && a > 0) {
        dst.data[outIdx] = Math.round(r / (a / 255));
        dst.data[outIdx + 1] = Math.round(g / (a / 255));
        dst.data[outIdx + 2] = Math.round(b / (a / 255));
        dst.data[outIdx + 3] = Math.round(a / count);
      } else {
        dst.data[outIdx] = 0;
        dst.data[outIdx + 1] = 0;
        dst.data[outIdx + 2] = 0;
        dst.data[outIdx + 3] = 0;
      }
    }
  }
  return dst;
}

const items = [
  {
    id: 'KSF_COSRX_SNAIL_96',
    name: 'COSRX Snail 96 Essence',
    category: 'misc',
    source: 'G:/All product/Untitled design (4)/COSRX  - Advanced Snail 96 Mucin Essence(100ML) 1.png',
    fileName: 'COSRX_SNAIL_96.png',
    width: 16,
    height: 16,
    footprintW: 1,
    footprintH: 1,
    canPlaceOnWalls: false,
    canPlaceOnSurfaces: true,
  },
  {
    id: 'KSF_COSRX_CREAM_92',
    name: 'COSRX Snail 92 Cream',
    category: 'misc',
    source: 'G:/All product/Untitled design (5)/COSRX  - Advanced Snail 92 All in one Cream (100g)1.png',
    fileName: 'COSRX_CREAM_92.png',
    width: 16,
    height: 16,
    footprintW: 1,
    footprintH: 1,
    canPlaceOnWalls: false,
    canPlaceOnSurfaces: true,
  },
  {
    id: 'KSF_COSRX_GOOD_MORNING',
    name: 'COSRX Good Morning Cleanser',
    category: 'misc',
    source: 'G:/All product/Untitled design (6)/COSRX Low Ph Good Morning Gel Cleanser 150ml 1.png',
    fileName: 'COSRX_GOOD_MORNING.png',
    width: 16,
    height: 16,
    footprintW: 1,
    footprintH: 1,
    canPlaceOnWalls: false,
    canPlaceOnSurfaces: true,
  },
  {
    id: 'KSF_COSRX_SALICYLIC',
    name: 'COSRX Salicylic Cleanser',
    category: 'misc',
    source: 'G:/All product/Untitled design (7)/Cosrx Salicylic Acid Daily Gentle Cleanser 1.png',
    fileName: 'COSRX_SALICYLIC.png',
    width: 16,
    height: 16,
    footprintW: 1,
    footprintH: 1,
    canPlaceOnWalls: false,
    canPlaceOnSurfaces: true,
  },
  {
    id: 'KSF_ALOE_VERA_GEL',
    name: 'Nature Republic Aloe Gel',
    category: 'misc',
    source: 'G:/All product/Untitled design (8)/Nature Republic Aloe Vera Soothing Gel (300ML) 1.png',
    fileName: 'ALOE_VERA_GEL.png',
    width: 16,
    height: 16,
    footprintW: 1,
    footprintH: 1,
    canPlaceOnWalls: false,
    canPlaceOnSurfaces: true,
  },
  {
    id: 'KSF_FELICIA_SUN_CREAM',
    name: 'Felicia Sun Cream',
    category: 'misc',
    source: 'G:/All product/Untitled design (9)/Felicia Natural Silk Fit Moisturizing Vitamin Sun Cream 1.png',
    fileName: 'FELICIA_SUN_CREAM.png',
    width: 16,
    height: 16,
    footprintW: 1,
    footprintH: 1,
    canPlaceOnWalls: false,
    canPlaceOnSurfaces: true,
  },
  {
    id: 'KSF_DABO_BLACK_SNAIL',
    name: 'Dabo Black Snail Cream',
    category: 'misc',
    source: 'G:/All product/Untitled design (10)/Dabo All In One Black Snail Repair Cream 100g 1.png',
    fileName: 'DABO_BLACK_SNAIL.png',
    width: 16,
    height: 16,
    footprintW: 1,
    footprintH: 1,
    canPlaceOnWalls: false,
    canPlaceOnSurfaces: true,
  },
  {
    id: 'KSF_SKIN1004_AMPOULE',
    name: 'SKIN1004 Centella Ampoule',
    category: 'misc',
    source: 'G:/All product/Untitled design (11)/SKIN1004 Madagascar Centella Tone Brightening Capsule Ampoule 100ML 1.png',
    fileName: 'SKIN1004_AMPOULE.png',
    width: 16,
    height: 16,
    footprintW: 1,
    footprintH: 1,
    canPlaceOnWalls: false,
    canPlaceOnSurfaces: true,
  },
  {
    id: 'KSF_CARENEL_CREAM',
    name: 'Care Nel Whitening Cream',
    category: 'misc',
    source: 'G:/All product/CARE NEL- Derma Alpha Arbutin Glutathione Whitening Cream(45ML)/1.png',
    fileName: 'CARENEL_CREAM.png',
    width: 16,
    height: 16,
    footprintW: 1,
    footprintH: 1,
    canPlaceOnWalls: false,
    canPlaceOnSurfaces: true,
  },
  {
    id: 'KSF_RICE_WATER_FOAM',
    name: 'Rice Water Bright Foam',
    category: 'misc',
    source: 'G:/All product/Untitled design (3)/𝐑𝐢𝐜𝐞 𝐖𝐚𝐭𝐞𝐫 𝐁𝐫𝐢𝐠𝐡𝐭 𝐂𝐥𝐞𝐚𝐧𝐬𝐢𝐧𝐠 𝐅𝐨𝐚𝐦 𝐅𝐚𝐜𝐞 𝐖𝐚𝐬𝐡 1.png',
    fileName: 'RICE_WATER_FOAM.png',
    width: 16,
    height: 16,
    footprintW: 1,
    footprintH: 1,
    canPlaceOnWalls: false,
    canPlaceOnSurfaces: true,
  },
  {
    id: 'KSF_WALL_LOGO',
    name: 'Korean Skin Food Wall Banner',
    category: 'wall',
    source: 'G:/All document/EK-LOGO.png',
    fileName: 'WALL_LOGO.png',
    width: 32,
    height: 16,
    footprintW: 2,
    footprintH: 1,
    canPlaceOnWalls: true,
    canPlaceOnSurfaces: false,
  },
  {
    id: 'KSF_3D_LOGO',
    name: 'Korean Skin Food 3D Wall Plaque',
    category: 'wall',
    source: 'G:/All document/3D Logo eker marlet.png',
    fileName: '3D_LOGO.png',
    width: 32,
    height: 32,
    footprintW: 2,
    footprintH: 2,
    canPlaceOnWalls: true,
    canPlaceOnSurfaces: false,
  },
  {
    id: 'KSF_WALL_EMBLEM',
    name: 'Korean Skin Food Wall Emblem',
    category: 'wall',
    source: 'G:/All document/eker_market_favicon-removebg-preview.png',
    fileName: 'WALL_EMBLEM.png',
    width: 16,
    height: 16,
    footprintW: 1,
    footprintH: 1,
    canPlaceOnWalls: true,
    canPlaceOnSurfaces: false,
  },
  {
    id: 'KSF_SNAIL_POSTER',
    name: 'COSRX Snail Poster',
    category: 'wall',
    source: 'G:/All product/Untitled design (4)/COSRX  - Advanced Snail 96 Mucin Essence(100ML) 4.png',
    fileName: 'SNAIL_POSTER.png',
    width: 32,
    height: 32,
    footprintW: 2,
    footprintH: 2,
    canPlaceOnWalls: true,
    canPlaceOnSurfaces: false,
  }
];

async function main() {
  console.log('Generating Korean Skin Food Pixel Agents External Assets...');
  fs.mkdirSync(FURNITURE_DIR, { recursive: true });

  for (const item of items) {
    const itemDir = path.join(FURNITURE_DIR, item.id);
    fs.mkdirSync(itemDir, { recursive: true });

    if (!fs.existsSync(item.source)) {
      console.warn(`[SKIP] Missing source file: ${item.source}`);
      continue;
    }

    try {
      const srcBuf = fs.readFileSync(item.source);
      const srcPng = PNG.sync.read(srcBuf);
      const dstPng = resample(srcPng, item.width, item.height);
      const outPngBuf = PNG.sync.write(dstPng);
      fs.writeFileSync(path.join(itemDir, item.fileName), outPngBuf);

      const manifest = {
        id: item.id,
        name: item.name,
        category: item.category,
        type: 'asset',
        file: item.fileName,
        width: item.width,
        height: item.height,
        footprintW: item.footprintW,
        footprintH: item.footprintH,
        canPlaceOnWalls: item.canPlaceOnWalls,
        canPlaceOnSurfaces: item.canPlaceOnSurfaces,
        backgroundTiles: 0
      };
      fs.writeFileSync(path.join(itemDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf-8');
      console.log(`✅ [OK] ${item.id} -> ${item.name} (${item.width}x${item.height})`);
    } catch (err) {
      console.error(`❌ [ERR] Error processing ${item.id}:`, err.message);
    }
  }

  // Register in ~/.pixel-agents/config.json
  const configDir = path.join(os.homedir(), '.pixel-agents');
  const configFile = path.join(configDir, 'config.json');
  try {
    fs.mkdirSync(configDir, { recursive: true });
    let config = { externalAssetDirectories: [] };
    if (fs.existsSync(configFile)) {
      try {
        config = JSON.parse(fs.readFileSync(configFile, 'utf-8'));
      } catch (e) {
        config = { externalAssetDirectories: [] };
      }
    }
    if (!Array.isArray(config.externalAssetDirectories)) {
      config.externalAssetDirectories = [];
    }

    const normalizedTarget = path.resolve(TARGET_BASE).replace(/\\/g, '/');
    const existing = config.externalAssetDirectories.map(p => path.resolve(p).replace(/\\/g, '/'));
    if (!existing.includes(normalizedTarget)) {
      config.externalAssetDirectories.push(path.resolve(TARGET_BASE));
      fs.writeFileSync(configFile, JSON.stringify(config, null, 2), 'utf-8');
      console.log(`✅ Registered external asset directory in ${configFile}`);
    } else {
      console.log(`ℹ️ Directory already registered in ${configFile}`);
    }
  } catch (err) {
    console.error(`⚠️ Could not automatically update ${configFile}:`, err.message);
  }

  console.log('\n🎉 Finished! Assets created at:', TARGET_BASE);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});

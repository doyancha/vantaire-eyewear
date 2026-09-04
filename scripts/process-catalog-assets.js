const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const rootDir = path.resolve(__dirname, '..');
const productsDir = path.join(rootDir, 'public', 'images', 'products');
const collectionsDir = path.join(rootDir, 'public', 'images', 'collections');
const editorialDir = path.join(rootDir, 'public', 'images', 'editorial');

async function processPngStudio(srcRel, destRel, bgColor = '#f8f8fa') {
  const src = path.join(rootDir, srcRel);
  const dest = path.join(rootDir, destRel);
  
  console.log(`Processing PNG studio: ${srcRel} -> ${destRel}`);
  const img = sharp(src);

  const resized = await img
    .resize(820, 820, { fit: 'inside', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  await sharp(resized)
    .flatten({ background: bgColor })
    .resize(1000, 1000, {
      fit: 'contain',
      background: bgColor
    })
    .jpeg({ quality: 92, mozjpeg: true })
    .toFile(dest);
}

async function processJpgSquare(srcRel, destRel, options = {}) {
  const src = path.join(rootDir, srcRel);
  const dest = path.join(rootDir, destRel);
  const { fit = 'cover', position = 'center', bgColor = '#f8f8fa' } = options;

  console.log(`Processing JPG: ${srcRel} -> ${destRel} (${fit})`);
  await sharp(src)
    .resize(1000, 1000, { fit, position, background: bgColor })
    .jpeg({ quality: 92, mozjpeg: true })
    .toFile(dest);
}

async function processBanner(srcRel, destRel, width, height, position = 'center') {
  const src = path.join(rootDir, srcRel);
  const dest = path.join(rootDir, destRel);

  console.log(`Processing Banner: ${srcRel} -> ${destRel} (${width}x${height})`);
  await sharp(src)
    .resize(width, height, { fit: 'cover', position })
    .jpeg({ quality: 92, mozjpeg: true })
    .toFile(dest);
}

async function run() {
  console.log('--- Starting Catalog Asset Processing ---');

  // Existing Products 13-22
  await processJpgSquare('public/images/templatesjungle/category3.jpg', 'public/images/products/eclipse-narrow-rectangle.jpg', { fit: 'cover', position: 'top' });
  await processPngStudio('public/images/eyesome/sun_sun10.png', 'public/images/products/valencia-oversized-gradient.jpg');
  await processPngStudio('public/images/eyesome/sun_sun7.png', 'public/images/products/aurelius-double-bridge.jpg');
  await processPngStudio('public/images/eyesome/sun_sun12.png', 'public/images/products/cannes-crystal-square.jpg');
  await processPngStudio('public/images/eyesome/sports_sports1.png', 'public/images/products/orion-sport-wrap.jpg');
  await processJpgSquare('public/images/pixabay_cands/pb_wood-sunglasses-2500493_1280.jpg', 'public/images/products/savoy-browline-classic.jpg', { fit: 'cover' });
  await processPngStudio('public/images/eyesome/sun_sun6.png', 'public/images/products/luna-sculpted-round.jpg');
  await processPngStudio('public/images/eyesome/sports_sports3.png', 'public/images/products/montreux-smoke-rectangle.jpg');
  await processPngStudio('public/images/eyesome/sun_sun8.png', 'public/images/products/palermo-amber-cat-eye.jpg');
  await processPngStudio('public/images/eyesome/sun_sun5.png', 'public/images/products/capri-gold-round.jpg');

  // Expansion Products 23-42
  await processPngStudio('public/images/eyesome/sun_sun1.png', 'public/images/products/santorini-pilot-sky.jpg');
  await processPngStudio('public/images/eyesome/sun_sun2.png', 'public/images/products/st-moritz-silver-mirror.jpg');
  await processPngStudio('public/images/eyesome/sun_sun3.png', 'public/images/products/portofino-rose-oversized.jpg');
  await processPngStudio('public/images/eyesome/sun_sun4.png', 'public/images/products/amalfi-mint-square.jpg');
  await processPngStudio('public/images/eyesome/sun_sun9.png', 'public/images/products/bellagio-ruby-cat-eye.jpg');
  await processPngStudio('public/images/eyesome/sun_sun11.png', 'public/images/products/tivoli-caramel-round.jpg');
  await processPngStudio('public/images/eyesome/sun_sun13.png', 'public/images/products/sorrento-oval-violet.jpg');
  await processPngStudio('public/images/eyesome/sun_sun14.png', 'public/images/products/geneva-navigator-navy.jpg');
  await processPngStudio('public/images/eyesome/sun_sun15.png', 'public/images/products/biarritz-tortoise-pilot.jpg');
  await processPngStudio('public/images/eyesome/sports_sports2.png', 'public/images/products/monza-aerodynamic-visor.jpg');
  await processPngStudio('public/images/eyesome/sports_sports4.png', 'public/images/products/berlin-steampunk-round.jpg');
  await processPngStudio('public/images/eyesome/sports_sports6.png', 'public/images/products/apex-stealth-speed-shield.jpg');
  await processPngStudio('public/images/eyesome/sports_sports7.png', 'public/images/products/kyoto-architectural-bar.jpg');
  await processPngStudio('public/images/eyesome/sports_sports8.png', 'public/images/products/tribeca-triangular-prism.jpg');
  await processPngStudio('public/images/eyesome/sports_sports9.png', 'public/images/products/elysee-arched-wireframe.jpg');
  await processJpgSquare('public/images/templatesjungle/item1.jpg', 'public/images/products/lugano-champagne-wayfarer.jpg', { fit: 'contain', bgColor: '#f6f8fb' });
  await processJpgSquare('public/images/templatesjungle/item2.jpg', 'public/images/products/ravello-ruby-double-bridge.jpg', { fit: 'contain', bgColor: '#f7f8fa' });
  await processJpgSquare('public/images/templatesjungle/item4.jpg', 'public/images/products/florence-pantoscopic-tortoise.jpg', { fit: 'contain', bgColor: '#f6f7fa' });
  await processJpgSquare('public/images/pixabay_cands/pb_wood-sunglasses-2500488_1280.jpg', 'public/images/products/nordic-zebrawood-browline.jpg', { fit: 'cover' });
  await processJpgSquare('public/images/pixabay_cands/pb_wood-sunglasses-2500491_1280.jpg', 'public/images/products/aspengrove-walnut-browline.jpg', { fit: 'cover' });

  // Collections covers
  await processBanner('public/images/templatesjungle/banner-img2.jpg', 'public/images/collections/collection-cat-eye.jpg', 1200, 800, 'center');
  await processBanner('public/images/products/noir-sovereign-aviator.jpg', 'public/images/collections/collection-aviator.jpg', 1200, 800, 'center');
  await processBanner('public/images/templatesjungle/category1.jpg', 'public/images/collections/collection-square.jpg', 1200, 800, 'center');

  const sportBuffer = await sharp(path.join(rootDir, 'public/images/eyesome/sports_sports2.png'))
    .resize(900, 600, { fit: 'inside' })
    .toBuffer();
  await sharp({
    create: {
      width: 1200,
      height: 800,
      channels: 3,
      background: { r: 24, g: 26, b: 30 }
    }
  })
    .composite([{ input: sportBuffer, gravity: 'center' }])
    .jpeg({ quality: 92 })
    .toFile(path.join(rootDir, 'public/images/collections/collection-sport.jpg'));

  // Editorial & Occasions
  await processBanner('public/images/templatesjungle/banner2.jpg', 'public/images/editorial/editorial-story.jpg', 1000, 1250, 'center');

  await sharp({
    create: {
      width: 800,
      height: 1000,
      channels: 3,
      background: { r: 26, g: 28, b: 32 }
    }
  })
    .composite([{ input: sportBuffer, gravity: 'center' }])
    .jpeg({ quality: 92 })
    .toFile(path.join(rootDir, 'public/images/editorial/occasion-sport.jpg'));

  const archBuffer = await sharp(path.join(rootDir, 'public/images/eyesome/sports_sports7.png'))
    .resize(700, 700, { fit: 'inside' })
    .toBuffer();
  await sharp({
    create: {
      width: 800,
      height: 1000,
      channels: 3,
      background: { r: 24, g: 25, b: 28 }
    }
  })
    .composite([{ input: archBuffer, gravity: 'center' }])
    .jpeg({ quality: 92 })
    .toFile(path.join(rootDir, 'public/images/editorial/occasion-architectural.jpg'));

  console.log('--- All Catalog Assets Successfully Processed ---');
}

run().catch((err) => {
  console.error('Error processing assets:', err);
  process.exit(1);
});

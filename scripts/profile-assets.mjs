import { writeFile, access } from 'node:fs/promises';
import sharp from 'sharp';

// Publish permanent, crawlable copies; never put an expiring storage URL in SEO tags.
try {
  const response = await fetch('https://serazul-backend.vercel.app/api/public/profile', { cache: 'no-store', signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error('Profile lookup failed');
  const { url } = await response.json();
  if (typeof url !== 'string' || !url.startsWith('https://')) throw new Error('Missing published profile photo');
  const image = await fetch(url, { signal: AbortSignal.timeout(20000) });
  if (!image.ok) throw new Error('Profile image download failed');
  const bytes = Buffer.from(await image.arrayBuffer());
  const photo = sharp(bytes).rotate();
  await Promise.all([
    photo.clone().resize(192, 192, { fit: 'cover' }).png().toFile('public/profile-icon.png'),
    photo.clone().resize(180, 180, { fit: 'cover' }).png().toFile('public/apple-touch-icon.png'),
    photo.clone().resize({ width: 1200, withoutEnlargement: true }).jpeg({ quality: 90 }).toFile('public/profile-photo.jpg')
  ]);
  // Replace the obsolete monogram at its old URL as well.
  const png = await sharp(bytes).rotate().resize(192,192,{fit:'cover'}).png().toBuffer();
  await writeFile('public/favicon.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"><image width="192" height="192" href="data:image/png;base64,${png.toString('base64')}"/></svg>`);
  console.log('Published current profile photo, search icon and sharing image');
} catch (error) {
  // An outage must not publish a blank icon over a known good photo.
  await Promise.all(['profile-icon.png', 'apple-touch-icon.png', 'profile-photo.jpg'].map(name => access('public/' + name)));
  console.warn('Keeping last published profile images:', error.message);
}

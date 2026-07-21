import { HeadObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getEnv } from './env.ts';

let r2Client: S3Client | null = null;

export function getR2Bucket() {
  return getEnv('R2_BUCKET');
}

export function getR2Client() {
  if (!r2Client) {
    r2Client = new S3Client({
      region: 'auto',
      endpoint: `https://${getEnv('R2_ACCOUNT_ID')}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: getEnv('R2_ACCESS_KEY_ID'),
        secretAccessKey: getEnv('R2_SECRET_ACCESS_KEY'),
      },
    });
  }
  return r2Client;
}

export async function headR2Object(key: string) {
  return await getR2Client().send(new HeadObjectCommand({
    Bucket: getR2Bucket(),
    Key: key,
  }));
}

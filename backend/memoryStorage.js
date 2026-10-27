const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');

let client;
function storageConfig() {
  const required = ['S3_BUCKET', 'S3_REGION', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY'];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) throw new Error(`Persistent memory storage is not configured. Set: ${missing.join(', ')}`);
  if (!client) client = new S3Client({
    region: process.env.S3_REGION,
    endpoint: process.env.S3_ENDPOINT || undefined,
    forcePathStyle: !!process.env.S3_ENDPOINT,
    credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY },
  });
  return { client, bucket: process.env.S3_BUCKET };
}
async function put(key, body, contentType) {
  const { client, bucket } = storageConfig();
  await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType, CacheControl: 'private, no-store' }));
}
async function get(key) {
  const { client, bucket } = storageConfig();
  return client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
}
async function remove(key) {
  const { client, bucket } = storageConfig();
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}
module.exports = { put, get, remove, storageConfig };

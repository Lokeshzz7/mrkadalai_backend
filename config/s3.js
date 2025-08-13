// config/s3.js
import AWS from "aws-sdk";
import crypto from "crypto";

AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

export const s3 = new AWS.S3();

export const uploadImage = async (fileBuffer, fileName) => {
  const params = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: `${crypto.randomBytes(16).toString("hex")}-${fileName}`,
    Body: fileBuffer,
    ACL: "public-read",
    ContentType: fileBuffer.mimetype || "image/jpeg",
  };

  const data = await s3.upload(params).promise();
  return data.Location; // Public URL of the uploaded image
};

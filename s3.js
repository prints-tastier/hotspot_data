import {S3} from "@aws-sdk/client-s3";
import dotenv from "dotenv";

export {
    S3Client
}

dotenv.config()

let S3Client = new S3({
    region: process.env.S3_REGION,
    credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID,
        secretAccessKey: process.env.S3_ACCESS_KEY_SECRET,
    }
})
import { respondWithJSON } from "./json";

import { type ApiConfig } from "../config";
import { type BunRequest, type S3File } from "bun";
import { getBearerToken, validateJWT } from "../auth";
import { getVideo, updateVideo } from "../db/videos";
import { BadRequestError, UserForbiddenError } from "./errors";
import { randomBytes } from "node:crypto";
import { unlink } from "node:fs/promises";

export async function handlerUploadVideo(cfg: ApiConfig, req: BunRequest) {
  const MAX_UPLOAD_LIMIT = 1 << 30; //1GB
  const { videoId } = req.params as { videoId?: string };
  const token = getBearerToken(req.headers);
  const userId = validateJWT(token, cfg.jwtSecret);

  const video = getVideo(cfg.db, videoId!);
  if (video?.userID !== userId) {
    throw new UserForbiddenError("User not authenticated");
  }

  const formData = await req.formData();
  const file = formData.get("video");
  if (!(file instanceof File)) {
    throw new BadRequestError("Thumbnail file missing");
  }
  if (file.size > MAX_UPLOAD_LIMIT) {
    throw new BadRequestError("File size exceeds 1GB");
  }

  if (file.type !== "video/mp4") {
    throw new BadRequestError("File type should be mp4");
  }

  const filePath = `${cfg.assetsRoot}/${randomBytes(32).toString("base64url")}.mp4`;

  try {
    await Bun.write(filePath, file);

    const s3file: S3File = cfg.s3Client.file(`${videoId}.mp4`, {
      type: "video/mp4",
    });

    await s3file.write(Bun.file(filePath));

    video.videoURL = `https://${cfg.s3Bucket}.s3.${cfg.s3Region}.amazonaws.com/${videoId}.mp4`;

    await updateVideo(cfg.db, video);
  } finally {
    await unlink(filePath).catch(() => {});
  }
  return respondWithJSON(200, null);
}

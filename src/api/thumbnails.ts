import { getBearerToken, validateJWT } from "../auth";
import { respondWithJSON } from "./json";
import { getVideo, updateVideo } from "../db/videos";
import type { ApiConfig } from "../config";
import type { BunRequest } from "bun";
import { BadRequestError, NotFoundError, UserForbiddenError } from "./errors";

type Thumbnail = {
  data: ArrayBuffer;
  mediaType: string;
};


export async function handlerUploadThumbnail(cfg: ApiConfig, req: BunRequest) {
  const { videoId } = req.params as { videoId?: string };
  if (!videoId) {
    throw new BadRequestError("Invalid video ID");
  }

  const token = getBearerToken(req.headers);
  const userID = validateJWT(token, cfg.jwtSecret);

  console.log("uploading thumbnail for video", videoId, "by user", userID);

  // TODO: implement the upload here

  const formData=await req.formData();
  const file = formData.get("thumbnail");
  if (!(file instanceof File)) {
    throw new BadRequestError("Thumbnail file missing");
  }
  const MAX_UPLOAD_SIZE=10<<20;
  if(file.size>MAX_UPLOAD_SIZE){
        throw new BadRequestError("File size exceeds 10MB");
  }
  const thumbnailData=await file.arrayBuffer();
  const thumbnailBase64= Buffer.from(thumbnailData).toString("base64");

  const dataURL=`data:image/png;base64,${thumbnailBase64}`;


  const thumbnailMediaType=await file.type;
  const video = getVideo(cfg.db, videoId);
  if(video?.userID!==userID){
    throw new UserForbiddenError("User not authenticated")
  }
  const thumbnailURL=dataURL
  video.thumbnailURL=thumbnailURL;
  updateVideo(cfg.db,video)

  return respondWithJSON(200, video);
}

import { getBearerToken, validateJWT } from "../auth";
import { respondWithJSON } from "./json";
import { getVideo, updateVideo } from "../db/videos";
import type { ApiConfig } from "../config";
import type { BunRequest } from "bun";
import { BadRequestError, NotFoundError, UserForbiddenError } from "./errors";
import { randomBytes } from "node:crypto";


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
  }else if(file.type !== "image/jpeg" && file.type !== "image/png"){
    throw new BadRequestError("Only jpeg and png types allowed")
  }
  const filePath=`${cfg.assetsRoot}/${randomBytes(32).toString("base64url")}.${file.type}`;
  await Bun.write(filePath,file)



  
  const video = getVideo(cfg.db, videoId);
  if(video?.userID!==userID){
    throw new UserForbiddenError("User not authenticated")
  }

  video.thumbnailURL=`http://localhost:${cfg.port}/${filePath}`
  updateVideo(cfg.db,video)


  return respondWithJSON(200, video);
}

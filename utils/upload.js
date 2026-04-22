const { getStorage } = require("../config/firebase");
const path = require("path");
const mime = { ".jpg":"image/jpeg",".jpeg":"image/jpeg",".png":"image/png",".pdf":"application/pdf" };

const uploadFile = async (buf, name, folder = "uploads") => {
  const ext  = path.extname(name);
  const dest = folder + "/" + Date.now() + "-" + Math.random().toString(36).slice(2) + ext;
  const file = getStorage().file(dest);
  await file.save(buf, { metadata: { contentType: mime[ext] || "application/octet-stream" }, public: true });
  return "https://storage.googleapis.com/" + getStorage().name + "/" + dest;
};
module.exports = { uploadFile };

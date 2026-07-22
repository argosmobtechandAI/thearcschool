import fs from "fs";
import path from "path";

/**
 * Resolve where a file lives on disk given its public URL.
 *
 * Local dev URLs:  http://localhost:3003/uploads/<category>/<filename>
 * VPS CDN URLs:    https://cdn.arcschool.cloud/<category>/<filename>
 *
 * Returns the absolute local filesystem path, or null if it can't be resolved.
 */
function resolveLocalPath(fileUrl) {
  if (!fileUrl) return null;

  const isVPS = fs.existsSync("/var/www") && process.platform === "linux";

  try {
    const url = new URL(fileUrl);
    const pathname = url.pathname; // e.g. /uploads/avatar/123-photo.jpg  OR  /avatar/123-photo.jpg

    if (isVPS) {
      // CDN URL: https://cdn.arcschool.cloud/<category>/<filename>
      // pathname = /<category>/<filename>
      return path.join("/var/www/arcschool/uploads", pathname);
    } else {
      // Local URL: http://localhost:3003/uploads/<category>/<filename>
      // pathname = /uploads/<category>/<filename>
      // Strip leading /uploads prefix
      const relative = pathname.startsWith("/uploads/")
        ? pathname.slice("/uploads".length)
        : pathname;
      return path.join(process.cwd(), "uploads", relative);
    }
  } catch {
    return null;
  }
}

/**
 * DELETE /api/upload/file
 * Body: { url: "https://cdn.arcschool.cloud/avatar/123-photo.jpg" }
 *
 * Deletes the physical file from the local or VPS filesystem.
 * Always returns 200 — a missing file is not an error (idempotent).
 */
export const deleteFile = (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ success: false, message: "No URL provided" });
  }

  const localPath = resolveLocalPath(url);

  if (!localPath) {
    return res.status(400).json({ success: false, message: "Could not resolve file path from URL" });
  }

  try {
    if (fs.existsSync(localPath)) {
      fs.unlinkSync(localPath);
      return res.status(200).json({ success: true, message: "File deleted" });
    } else {
      // File not found on disk — treat as already deleted (idempotent)
      return res.status(200).json({ success: true, message: "File not found on disk (already deleted or never saved)" });
    }
  } catch (err) {
    return res.status(500).json({ success: false, message: `Failed to delete file: ${err.message}` });
  }
};

export { resolveLocalPath };

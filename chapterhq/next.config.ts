import type { NextConfig } from "next";
import fs from "fs";
import path from "path";

// Clean up duplicate invite route if it exists
try {
  const oldPagePath = path.join(process.cwd(), "src/app/(auth)/invite/[token]/page.tsx");
  if (fs.existsSync(oldPagePath)) {
    fs.unlinkSync(oldPagePath);
    console.log("Cleaned up duplicate invitation page file successfully.");
  }
  const oldDirPath = path.join(process.cwd(), "src/app/(auth)/invite/[token]");
  if (fs.existsSync(oldDirPath)) {
    fs.rmdirSync(oldDirPath);
    console.log("Cleaned up duplicate invitation directory.");
  }
  const oldParentDirPath = path.join(process.cwd(), "src/app/(auth)/invite");
  if (fs.existsSync(oldParentDirPath) && fs.readdirSync(oldParentDirPath).length === 0) {
    fs.rmdirSync(oldParentDirPath);
    console.log("Cleaned up parent invite folder in (auth).");
  }
} catch (err) {
  console.warn("Auto-cleanup warning:", err);
}

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // Prevent Turbopack/webpack from bundling Prisma with the wrong module
  // condition (edge-light/browser → Accelerate WASM) instead of `node`
  // (binary engine). This forces Node's native resolver at runtime.
  serverExternalPackages: ["@prisma/client", ".prisma/client"],
};

export default nextConfig;

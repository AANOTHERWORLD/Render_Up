import * as http from "node:http";
import { randomUUID } from "node:crypto";
import Busboy from "busboy";

import { runDepthAnythingV2, runSDXLControlNetDepth } from "./providers/replicate.js";

interface ParsedForm {
  fields: Record<string, string>;
  file?: Buffer;
}

function parseMultipart(req: http.IncomingMessage): Promise<ParsedForm> {
  return new Promise((resolve, reject) => {
    const busboy = Busboy({ headers: req.headers, limits: { files: 1 } });
    const fields: Record<string, string> = {};
    let fileBuffer: Buffer | undefined;

    busboy.on("field", (name, value) => {
      fields[name] = value;
    });

    busboy.on("file", (name, file) => {
      if (name !== "image") {
        file.resume();
        return;
      }

      const chunks: Buffer[] = [];
      file.on("data", chunk => chunks.push(chunk));
      file.on("end", () => {
        fileBuffer = Buffer.concat(chunks);
      });
    });

    busboy.on("finish", () => {
      resolve({ fields, file: fileBuffer });
    });

    busboy.on("error", reject);

    req.pipe(busboy);
  });
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === "POST" && req.url === "/enhance") {
      const { fields, file } = await parseMultipart(req);
      if (!file) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "Missing image" }));
        return;
      }

      const depthUrl = await runDepthAnythingV2(file);

      const images = await runSDXLControlNetDepth({
        image: file,
        control_image: depthUrl,
        prompt: fields.preset || "",
        strength: fields.strength ? Number(fields.strength) : undefined,
        controlnet_conditioning_scale:
          fields.preserveComposition === "true" ? 1 : 0.5,
      });

      const response = {
        requestId: randomUUID(),
        images,
        meta: fields,
        depthUrl,
      };

      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(response));
      return;
    }

    res.statusCode = 404;
    res.end("Not Found");
  } catch (err) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: (err as Error).message }));
  }
});

const PORT = Number(process.env.PORT) || 8787;
server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});


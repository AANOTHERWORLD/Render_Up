import * as http from "node:http";
import { randomUUID } from "node:crypto";
import Busboy from "busboy";
import sizeOf from "image-size";
import { runDepthAnythingV2, runSDXLControlNetDepth } from "./providers/replicate";

interface RequestBody {
  [key: string]: any;
}

interface ParsedForm {
  fields: Record<string, string>;
  file?: Buffer;
}

type LightingPreset = "neutral_overcast" | "golden_hour" | "dramatic_contrast";

const PRESET_PROMPTS: Record<LightingPreset, string> = {
  neutral_overcast: "neutral overcast lighting, photoreal architecture",
  golden_hour: "warm golden hour lighting, photoreal architecture",
  dramatic_contrast: "dramatic high contrast lighting, photoreal architecture",
};

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

function parseJson(req: http.IncomingMessage): Promise<RequestBody> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", chunk => {
      data += chunk;
    });
    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}

const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  try {
    if (req.method === "GET" && req.url === "/health") {
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    if (req.method === "POST" && req.url === "/depth") {
      const body = await parseJson(req);
      const output = await runDepthAnythingV2(body.image, body.modelSize);
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ output }));
      return;
    }

    if (req.method === "POST" && req.url === "/controlnet") {
      const body = await parseJson(req);
      const output = await runSDXLControlNetDepth(body as any);
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ output }));
      return;
    }

    if (req.method === "POST" && req.url === "/enhance") {
      const { fields, file } = await parseMultipart(req);
      if (!file) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "Missing image" }));
        return;
      }

      const preset = fields.preset as LightingPreset;
      const strength = fields.strength ? Number(fields.strength) : undefined;
      const preserveComposition = fields.preserveComposition === "true";
      const upscale = fields.upscale;

      let width: number | undefined;
      let height: number | undefined;
      try {
        const size = sizeOf(file);
        width = size.width;
        height = size.height;
        if (upscale && upscale !== "native" && width && height) {
          const factor = parseFloat(upscale);
          if (!isNaN(factor)) {
            width = Math.round(width * factor);
            height = Math.round(height * factor);
          }
        }
        if (width && height) {
          width = Math.round(width / 8) * 8;
          height = Math.round(height / 8) * 8;
        }
      } catch {
        // ignore dimension errors
      }

      const depthUrl = await runDepthAnythingV2(file);
      const prompt = PRESET_PROMPTS[preset] || "";
      const images = await runSDXLControlNetDepth({
        image: file,
        control_image: depthUrl,
        prompt,
        strength,
        controlnet_conditioning_scale: preserveComposition ? 1 : 0.5,
        width,
        height,
      });

      const response = {
        requestId: randomUUID(),
        images,
        meta: { preset, strength, preserveComposition, upscale, width, height },
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


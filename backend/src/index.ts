import * as http from "node:http";
import { randomUUID } from "node:crypto";
import { runDepthAnythingV2, runSDXLControlNetDepth } from "./providers/replicate.js";

interface RequestBody {
  [key: string]: any;
}

type LightingPreset = "neutral_overcast" | "golden_hour" | "dramatic_contrast";

const PRESET_PROMPTS: Record<LightingPreset, string> = {
  neutral_overcast: "neutral overcast lighting, photoreal architecture",
  golden_hour: "warm golden hour lighting, photoreal architecture",
  dramatic_contrast: "dramatic high contrast lighting, photoreal architecture"
};

function parseJson(req: http.IncomingMessage): Promise<RequestBody> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", chunk => { data += chunk; });
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
  try {
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
      const body = await parseJson(req);
      const image = body.image;
      const preset = body.preset as LightingPreset;
      const strength = body.strength !== undefined ? Number(body.strength) : undefined;
      const preserveComposition = body.preserveComposition === true || body.preserveComposition === "true";
      const upscale = body.upscale;

      const depthUrl = await runDepthAnythingV2(image);
      const prompt = PRESET_PROMPTS[preset] || "";
      const images = await runSDXLControlNetDepth({
        image,
        control_image: depthUrl,
        prompt,
        strength
      });

      const response = {
        requestId: randomUUID(),
        images,
        meta: { preset, strength, preserveComposition, upscale },
        depthUrl
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


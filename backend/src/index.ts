import * as http from "node:http";
import { runDepthAnythingV2, runSDXLControlNetDepth } from "./providers/replicate.js";

interface RequestBody {
  [key: string]: any;
}

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


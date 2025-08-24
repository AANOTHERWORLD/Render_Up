import axios from "axios";

const REPLICATE_TOKEN = process.env.REPLICATE_API_TOKEN!;
if (!REPLICATE_TOKEN) throw new Error("Missing REPLICATE_API_TOKEN");

export type ReplicatePrediction = {
  id: string;
  status: "starting"|"processing"|"succeeded"|"failed"|"canceled";
  output?: any;
  error?: string|null;
};

export async function createPrediction(
  version: string,
  input: Record<string, any>,
  webhook?: { url: string; secret: string }
): Promise<ReplicatePrediction> {
  const body: any = { version, input };
  if (webhook?.url) {
    body.webhook = webhook.url;
    body.webhook_events_filter = ["completed"];
  }
  const res = await axios.post("https://api.replicate.com/v1/predictions", body, {
    headers: {
      Authorization: `Token ${REPLICATE_TOKEN}`,
      "Content-Type": "application/json"
    }
  });
  return res.data;
}

export async function getPrediction(id: string): Promise<ReplicatePrediction> {
  const res = await axios.get(`https://api.replicate.com/v1/predictions/${id}`, {
    headers: { Authorization: `Token ${REPLICATE_TOKEN}` }
  });
  return res.data;
}

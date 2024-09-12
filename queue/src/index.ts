// queue-service/index.ts
import express, { Request, Response } from "express";
import { Queue, Worker, Job } from "bullmq";
import IORedis from "ioredis";
import axios from "axios";

const app = express();
app.use(express.json());

const redisClient = new IORedis(
  process.env.REDIS_URL || "redis://localhost:6379"
);

const notificationQueue = new Queue("notifications", {
  connection: redisClient,
});

interface EnqueueJobData {
  type: "email" | "mobile";
  data: EmailJobData | MobileJobData;
}

interface EmailJobData {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

interface MobileJobData {
  token: string;
  title: string;
  body: string;
}

app.post(
  "/enqueue",
  async (req: Request<{}, {}, EnqueueJobData>, res: Response) => {
    try {
      const { type, data } = req.body;
      await notificationQueue.add(type, data);
      res.status(200).json({ message: "Job enqueued successfully" });
    } catch (error) {
      console.error("Error enqueueing job:", error);
      res.status(500).json({ error: "Failed to enqueue job" });
    }
  }
);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Queue service listening on port ${PORT}`);
});

// queue-service/worker.ts
const worker = new Worker(
  "notifications",
  async (job: Job) => {
    const { type, data } = job.data as EnqueueJobData;

    switch (type) {
      case "email":
        await axios.post(`${process.env.EMAIL_SERVICE_URL}/send`, data);
        break;
      case "mobile":
        await axios.post(`${process.env.MOBILE_SERVICE_URL}/send`, data);
        break;
      default:
        throw new Error(`Unknown job type: ${type}`);
    }
  },
  { connection: redisClient }
);

worker.on("completed", (job: Job) => {
  console.log(`Job ${job.id} completed`);
});

worker.on("failed", (job: Job<any, any, string> | undefined, err: Error) => {
  if (job) {
    console.error(`Job ${job.id} failed with error ${err}`);
  } else {
    console.error(`Job failed with error ${err}`);
  }
});

console.log("Worker started");

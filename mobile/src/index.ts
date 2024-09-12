// mobile-notification-service/index.ts
import express, { Request, Response } from "express";
import admin from "firebase-admin";

const app = express();
app.use(express.json());

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: process.env.FIREBASE_PROJECT_ID,
});

interface NotificationData {
  token: string;
  title: string;
  body: string;
}

app.post(
  "/send",
  async (req: Request<{}, {}, NotificationData>, res: Response) => {
    try {
      const { token, title, body } = req.body;

      const message: admin.messaging.Message = {
        notification: { title, body },
        token: token,
      };

      const response = await admin.messaging().send(message);
      console.log("Successfully sent message:", response);
      res.status(200).json({ message: "Notification sent successfully" });
    } catch (error) {
      console.error("Error sending notification:", error);
      res.status(500).json({ error: "Failed to send notification" });
    }
  }
);

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`Mobile notification service listening on port ${PORT}`);
});

require("dotenv").config();
const Redis = require("ioredis");
const express = require("express");

const app = express();

// Create Redis client using Upstash credentials
const redis = new Redis({
  host: process.env.UPSTASH_REDIS_URL,
  password: process.env.UPSTASH_REDIS_TOKEN,
  tls: {},
});

// Rate limiting middleware
const rateLimiter = async (req, res, next) => {
  const ip = req.ip; // Use the IP address of the client
  const rateLimitWindow = 60; // Rate limit window in seconds (e.g., 1 minute)
  const maxRequests = 10; // Max number of requests per window

  try {
    const key = `rate-limit:${ip}`; // Create a unique key based on the user's IP address

    // Increment the request count in Redis and set an expiration time if it's a new key
    const requests = await redis.incr(key);
    if (requests === 1) {
      // Set expiration time for the key when it is created
      await redis.expire(key, rateLimitWindow);
    }

    if (requests > maxRequests) {
      const ttl = await redis.ttl(key); // Get the remaining time to wait
      return res.status(429).json({
        message: `Rate limit exceeded. Try again in ${ttl} seconds.`,
      });
    }

    next();
  } catch (error) {
    console.error("Error in rate limiter:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Apply rate limiting middleware to all routes
app.use(rateLimiter);

app.get("/", (req, res) => {
  res.send("Welcome! You are within the rate limit.");
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});

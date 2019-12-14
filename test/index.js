const Security = require("../dist");
const express = require("express");
const redis = require("redis").createClient();
redis.on("connect", ()=>{
    console.log("Connected");
    redis.del("app:blocked:ips");
    redis.sadd("app:blocked:ips", ['::1'], (err, res)=>{
        console.log(err);
        console.log(res);
    });
});
Security.initializeApp({
    logEnabled: true,
    rateLimit: {
        redis: {
            host: "localhost",
            port: 6379,
            retry_strategy: options => {
                return 200;
            }
        },
        numberOfRequests: 4,
        timeFrame: 20,
        provideIp: req => req.connection.remoteAddress
    },
    blockIp: {
        redis: {
            host: "localhost",
            port: 6379,
            retry_strategy: options => {
                return 200;
            }
        },
        redisKey: "app:blocked:ips",
        provideIp: req => req.connection.remoteAddress
    }
});
const app = express();

app.use((req, res, next)=>{
    console.log("Time: "+ new Date().toISOString());
    next();
});

app.use(Security.getInstance().middlewareBlockIp);

app.use(Security.getInstance().rateLimitMiddleware);

app.listen(3000, ()=>{
    console.log("Test App Started");
});

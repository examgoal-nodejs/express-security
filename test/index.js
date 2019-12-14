const Security = require("../dist");
const express = require("express");
const redis = require("redis").createClient();
redis.keys("*", (err, reply) => {
    reply.forEach(el=>{
        redis.del(el);
    });
});
setInterval(()=>{
    redis.keys("*", (err, reply) => {
        reply.forEach(el=>{
            redis.ttl(el, (ee, e)=>{
                console.log(el, "expire at ", e);
            });
        });
    });
}, 3000);
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
        redisPrefix: "app_rate_limit",
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

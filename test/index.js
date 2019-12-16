
const ipRangeCheck = require("ip-range-check");

(async ()=>{
    let arr = [];
    let count = 1000;
    for (let i = 0; i < count; i++){
        arr.push(new Promise((resolve, reject) => {
            return resolve(ipRangeCheck('9.02.02.0', '10.0.0.0/8'));
        }));
    }
    console.time("Start Test");
    await Promise.all(arr);
    console.timeEnd("Start Test");
    console.time("Start Test 2");
    for (let i = 0; i < count; i++){
        ipRangeCheck('10.02.02.0', '10.0.0.0/8')
    }
    console.timeEnd("Start Test 2");
})();



// const Security = require("../dist");
// const express = require("express");
// const redis = require("redis").createClient();
//
// redis.keys("*", (err, reply) => {
//     reply.forEach(el=>{
//         redis.del(el);
//     });
// });
// setInterval(()=>{
//     redis.keys("*", (err, reply) => {
//         reply.forEach(el=>{
//             redis.ttl(el, (ee, e)=>{
//                 console.log(el, "expire at ", e);
//             });
//         });
//     });
// }, 3000);
// Security.initializeApp({
//     logEnabled: true,
//     rateLimit: {
//         redis: {
//             host: "localhost",
//             port: 6379,
//             retry_strategy: options => {
//                 return 200;
//             }
//         },
//         redisPrefix: "app_rate_limit",
//         numberOfRequests: 4,
//         timeFrame: 20,
//         provideIp: req => req.connection.remoteAddress
//     },
//     blockIp: {
//         redis: {
//             host: "localhost",
//             port: 6379,
//             retry_strategy: options => {
//                 return 200;
//             }
//         },
//         redisKey: "app:blocked:ips",
//         provideIp: req => req.connection.remoteAddress
//     }
// });
// const app = express();
//
// app.use((req, res, next)=>{
//     console.log("Time: "+ new Date().toISOString());
//     next();
// });
//
// app.use(Security.getInstance().middlewareBlockIp);
//
// app.use(Security.getInstance().rateLimitMiddleware);
//
// app.listen(3000, ()=>{
//     console.log("Test App Started");
// });

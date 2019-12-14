import {NextFunction, Request, Response} from 'express';
import {RedisClient} from 'redis';
import {AppOptions} from "./types";
import ipRangeCheck from 'ip-range-check';

const INSTANCES : {[key: string]: SecurityClient} = {};

class SecurityClient {

    readonly options: AppOptions;
    private rateLimitRedisClient?: RedisClient;
    private blockIpRedisClient?: RedisClient;
    private blockedIpMap: {ips: string[], lastUpdated: number} = {
        ips: [],
        lastUpdated: 0
    };
    constructor(options: AppOptions){
        this.options = options;
        this.prepare();
    }

    private prepare(){
        if(this.options.rateLimit){
            this.rateLimitRedisClient = new RedisClient(this.options.rateLimit.redis);
            this.rateLimitRedisClient.on("connect", ()=>{
                this.log("Redis Rate Limit Client connected");
            });
        }
        if(this.options.blockIp){
            this.blockIpRedisClient = new RedisClient(this.options.blockIp.redis);
            this.blockIpRedisClient.on("connect", ()=>{
                this.log("Redis Block Ip Client connected");
            });
        }
    }

    get rateLimitMiddleware() : (req: Request, res: Response, next: NextFunction) => any {
        return (req: Request, res: Response, next: NextFunction) =>{
            if(this.rateLimitRedisClient && this.options.rateLimit){
                const ip = this.options.rateLimit.provideIp(req);
                const prefix = (this.options.rateLimit.redisPrefix || '').concat((this.options.rateLimit.redisPrefix || '') ? ":" : "");
                const k = `${prefix}${ip}`;
                const k2 = `${prefix}request:${ip}`;
                this.rateLimitRedisClient.get(k, (err, val)=>{
                    if(err || !this.options.rateLimit || !this.rateLimitRedisClient) return next();
                    try {
                        if(!isNaN(Number(val || 0)) && Number(val || 0) >= this.options.rateLimit.numberOfRequests){
                            this.log("Too many requests from ip ".concat(ip));
                            if(this.options.rateLimit.customHandler){
                                return this.options.rateLimit.customHandler(req, res, next);
                            }else {
                                return res.status(429).send("Too many requests");
                            }
                        }else {
                            const m = this.rateLimitRedisClient.multi();
                            m.incr(k);
                            if(!val){
                                m.expire(k, this.options.rateLimit.timeFrame);
                            }
                            m.incr(k2);
                            this.rateLimitRedisClient.get(k2, (err, res)=>{
                                if(err) return next();
                                if(!res){
                                    m.expire(k2, 300);
                                }
                                m.exec(()=> next());
                            })
                        }
                    }catch (e) {
                        return next();
                    }
                });
            }else {
               return next();
            }
        }
    }

     get middlewareBlockIp() : (req: Request, res: Response, next: NextFunction) => any{
        return (req: Request, res: Response, next: NextFunction) =>{
            if(!this.blockIpRedisClient || !this.options.blockIp) return next();
            if((Date.now() - this.blockedIpMap.lastUpdated) < ((this.options.blockIp.timeFrame || 10) * 1000)){
                this.checkIfIpBlocked(this.options.blockIp.provideIp(req), req, res, next);
            }else {
                this.log("Refreshing Blocked IPS");
                this.blockIpRedisClient.smembers(this.options.blockIp.redisKey, (err, ips)=>{
                    if(err || !this.options.blockIp) return next();
                    this.blockedIpMap.ips = ips || [];
                    this.blockedIpMap.lastUpdated = Date.now();
                    this.checkIfIpBlocked(this.options.blockIp.provideIp(req), req, res, next);
                });
            }
        }
    }

    checkIfIpBlocked(ip: string, req: Request, res: Response, next: NextFunction){
        if(!this.options.blockIp) return next();
        const ipAddresses = this.blockedIpMap.ips;
        const l = ipAddresses.length;
        let block = false;
        for (let i = 0; i < l; i++){
            if(ipRangeCheck(ip, ipAddresses[i])){
                this.log(`Blocking Ip ${ip}`);
                block = true;
                break;
            }
        }
        if(block){
            if(this.options.blockIp.customHandler){
                return this.options.blockIp.customHandler(req, res, next);
            }else {
                return res.status(401).send("Client is not authorized");
            }
        }else {
            return next();
        }
    }

    log(message: any){
        if(this.options.logEnabled){
            console.log(`${this.name}:${new Date().toISOString()}:`, message);
        }
    }

    get name(){
        return this.options.name || '[DEFAULT]';
    }

    static initializeApp(options: AppOptions) : SecurityClient{
        const n = options.name || '[DEFAULT]';
        if(INSTANCES.hasOwnProperty(n)){
            throw new Error(`Security Client has already an instance of name ${n}`);
        }
        const app = new SecurityClient(options);
        INSTANCES[n] = app;
        return app;
    }

    static getInstance(name?: string) : SecurityClient{
        const n = name || '[DEFAULT]';
        if(!INSTANCES.hasOwnProperty(n)){
            throw new Error(`Security Client has no instance of name ${n}`);
        }
        return INSTANCES[n];
    }

}

export = SecurityClient;
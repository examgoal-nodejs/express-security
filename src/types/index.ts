import {ClientOpts} from "redis";
import {NextFunction, Request, Response} from "express";

export interface AppOptions {
    name?: string,
    logEnabled?: boolean,
    rateLimit?: RateLimitOptions,
    blockIp?: BlockIpOptions
}

export interface BlockIpOptions {
    redis: ClientOpts,
    redisKey: string,
    provideIp: (req: Request) => string,
    customHandler?: (req: Request, res: Response, next: NextFunction) => any
}

export interface RateLimitOptions {
    redis: ClientOpts,
    redisPrefix: string,
    numberOfRequests: number,
    timeFrame: number,
    provideIp: (req: Request) => string,
    customHandler?: (req: Request, res: Response, next: NextFunction) => any
}
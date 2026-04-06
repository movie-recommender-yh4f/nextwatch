import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const noopLimiter = {
  limit: async (_key: string) => ({ success: true, limit: 0, remaining: 0, reset: 0 }),
}

export function createRateLimiter() {
  const config = useRuntimeConfig()
  const { redisUrl, redisToken } = config.upstash

  if (!redisUrl || !redisToken) {
    return {
      tmdbLimiter: noopLimiter,
      recommednationLimiter: noopLimiter,
    }
  }

  const redis = new Redis({
    url: redisUrl,
    token: redisToken,
  })

  const tmdbLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(40, '1 s'),
    analytics: true,
  })

  const modelLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(20, '1 d'),
    analytics: true,
  })

  return {
    tmdbLimiter,
    recommednationLimiter: modelLimiter,
  }
}

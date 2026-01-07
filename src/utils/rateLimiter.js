class RateLimiter {
    constructor() {
        this.limits = new Map();
    }

    /**
     * Check if an action is allowed
     * @param {string} key - Unique identifier for the action (e.g., 'gemini_api')
     * @param {number} limit - Max requests allowed
     * @param {number} windowMs - Time window in milliseconds
     * @returns {boolean} - True if allowed, False if limit exceeded
     */
    check(key, limit, windowMs) {
        const now = Date.now();

        if (!this.limits.has(key)) {
            this.limits.set(key, []);
        }

        const timestamps = this.limits.get(key);

        // Remove timestamps outside the window
        const validTimestamps = timestamps.filter(ts => now - ts < windowMs);

        if (validTimestamps.length >= limit) {
            // Update with cleaned timestamps just to keep memory check
            this.limits.set(key, validTimestamps);
            return false;
        }

        validTimestamps.push(now);
        this.limits.set(key, validTimestamps);
        return true;
    }
}

export const rateLimiter = new RateLimiter();

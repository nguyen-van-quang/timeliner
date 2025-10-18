/* eslint-disable */
/**
 * Global Event Bus - Thay thế cho việc truyền dispatcher qua props
 * Sử dụng Singleton pattern để đảm bảo chỉ có 1 instance
 */

class EventBus {
    constructor() {
        if (EventBus.instance) {
            return EventBus.instance;
        }
        
        this.listeners = new Map();
        this.middleware = [];
        this.debug = false;
        
        EventBus.instance = this;
    }

    /**
     * Đăng ký middleware để xử lý event trước khi dispatch
     */
    use(middlewareFn) {
        this.middleware.push(middlewareFn);
    }

    /**
     * Lắng nghe event
     */
    on(eventType, callback, options = {}) {
        if (!this.listeners.has(eventType)) {
            this.listeners.set(eventType, []);
        }
        
        const listener = {
            callback,
            once: options.once || false,
            namespace: options.namespace || null,
            priority: options.priority || 0
        };
        
        const listeners = this.listeners.get(eventType);
        listeners.push(listener);
        
        // Sort by priority (higher priority first)
        listeners.sort((a, b) => b.priority - a.priority);
        
        // Return unsubscribe function
        return () => this.off(eventType, callback);
    }

    /**
     * Lắng nghe event chỉ 1 lần
     */
    once(eventType, callback, options = {}) {
        return this.on(eventType, callback, { ...options, once: true });
    }

    /**
     * Hủy lắng nghe event
     */
    off(eventType, callback) {
        if (!this.listeners.has(eventType)) return;
        
        const listeners = this.listeners.get(eventType);
        const index = listeners.findIndex(l => l.callback === callback);
        if (index > -1) {
            listeners.splice(index, 1);
        }
        
        // Clean up empty event arrays
        if (listeners.length === 0) {
            this.listeners.delete(eventType);
        }
    }

    /**
     * Hủy tất cả listeners của namespace
     */
    offNamespace(namespace) {
        for (const [eventType, listeners] of this.listeners.entries()) {
            const filtered = listeners.filter(l => l.namespace !== namespace);
            if (filtered.length === 0) {
                this.listeners.delete(eventType);
            } else {
                this.listeners.set(eventType, filtered);
            }
        }
    }

    /**
     * Emit event
     */
    emit(eventType, ...args) {
        // Apply middleware
        let event = { type: eventType, args, cancelled: false };
        
        for (const middleware of this.middleware) {
            event = middleware(event);
            if (event.cancelled) {
                if (this.debug) console.log(`Event ${eventType} cancelled by middleware`);
                return;
            }
        }
        
        if (this.debug) {
            console.log(`🚀 Event: ${eventType}`, ...event.args);
        }
        
        if (!this.listeners.has(eventType)) return;
        
        const listeners = [...this.listeners.get(eventType)]; // Copy to avoid issues with modifications
        const toRemove = [];
        
        for (let i = 0; i < listeners.length; i++) {
            const listener = listeners[i];
            
            try {
                listener.callback(...event.args);
                
                if (listener.once) {
                    toRemove.push(listener.callback);
                }
            } catch (error) {
                console.error(`Error in event listener for ${eventType}:`, error);
            }
        }
        
        // Remove once listeners
        toRemove.forEach(callback => this.off(eventType, callback));
    }

    /**
     * Enable/disable debug mode
     */
    setDebug(enabled) {
        this.debug = enabled;
    }

    /**
     * Clear all listeners
     */
    clear() {
        this.listeners.clear();
    }

    /**
     * Get event statistics
     */
    getStats() {
        const stats = {};
        for (const [eventType, listeners] of this.listeners.entries()) {
            stats[eventType] = listeners.length;
        }
        return stats;
    }
}

// Export singleton instance
const eventBus = new EventBus();

export { eventBus };

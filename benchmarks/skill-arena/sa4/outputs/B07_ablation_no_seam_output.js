export class LruCache {
  constructor(capacity) {
    this.capacity = capacity;
    this.map = new Map();
  }
  get(key) {
    if (!this.map.has(key)) return null;
    const item = this.map.get(key);
    if (item.exp && Date.now() > item.exp) { this.map.delete(key); return null; }
    this.map.delete(key);
    this.map.set(key, item);
    return item.val;
  }
  set(key, val, ttl = 0) {
    if (this.map.has(key)) this.map.delete(key);
    else if (this.map.size >= this.capacity) {
      const first = this.map.keys().next().value;
      this.map.delete(first);
    }
    this.map.set(key, { val, exp: ttl > 0 ? Date.now() + ttl : null });
  }
}
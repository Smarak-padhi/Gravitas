export class SystemClock {
  now() { return Date.now(); }
}

class Node {
  constructor(key, val, expiresAt) {
    this.key = key;
    this.val = val;
    this.expiresAt = expiresAt;
    this.prev = null;
    this.next = null;
  }
}

export class LruCache {
  constructor(capacity, clock = new SystemClock()) {
    if (!capacity || capacity <= 0) throw new Error("Capacity must be positive");
    this.capacity = capacity;
    this.clock = clock;
    this.map = new Map();
    this.head = new Node(null, null, null);
    this.tail = new Node(null, null, null);
    this.head.next = this.tail;
    this.tail.prev = this.head;
  }

  _remove(node) {
    node.prev.next = node.next;
    node.next.prev = node.prev;
  }

  _addHead(node) {
    node.next = this.head.next;
    node.prev = this.head;
    this.head.next.prev = node;
    this.head.next = node;
  }

  get(key) {
    if (!this.map.has(key)) return null;
    const node = this.map.get(key);
    if (node.expiresAt && this.clock.now() > node.expiresAt) {
      this._remove(node);
      this.map.delete(key);
      return null;
    }
    this._remove(node);
    this._addHead(node);
    return node.val;
  }

  set(key, val, ttlMs = 0) {
    const expiresAt = ttlMs > 0 ? this.clock.now() + ttlMs : null;
    if (this.map.has(key)) {
      const node = this.map.get(key);
      node.val = val;
      node.expiresAt = expiresAt;
      this._remove(node);
      this._addHead(node);
      return;
    }
    if (this.map.size >= this.capacity) {
      const lru = this.tail.prev;
      this._remove(lru);
      this.map.delete(lru.key);
    }
    const newNode = new Node(key, val, expiresAt);
    this.map.set(key, newNode);
    this._addHead(newNode);
  }

  size() { return this.map.size; }
}
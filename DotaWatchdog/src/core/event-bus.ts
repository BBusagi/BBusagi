import { EventEmitter } from 'events'

class EventBus extends EventEmitter {
  private static instance: EventBus

  static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus()
    }
    return EventBus.instance
  }

  private constructor() {
    super()
    this.setMaxListeners(20)
  }
}

export const eventBus = EventBus.getInstance()

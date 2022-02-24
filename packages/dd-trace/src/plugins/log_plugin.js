'use strict'

const { LOG } = require('../../../../ext/formats')
const Plugin = require('./plugin')
const { storage } = require('../../../datadog-core')

const hasOwn = (obj, prop) => Object.prototype.hasOwnProperty.call(obj, prop)

function messageProxy (message, holder) {
  return new Proxy(message, {
    get (target, p, receiver) {
      switch (p) {
        case Symbol.toStringTag:
          return Object.prototype.toString.call(target).slice(8, -1)
        case 'dd':
          return holder.dd
        default:
          return Reflect.get(target, p, receiver)
      }
    },
    ownKeys (target) {
      const ownKeys = Reflect.ownKeys(target)
      return hasOwn(target, 'dd') ? ownKeys : ['dd', ...ownKeys]
    },
    getOwnPropertyDescriptor (target, p) {
      return Reflect.getOwnPropertyDescriptor(p === 'dd' ? holder : target, p)
    }
  })
}

module.exports = class LogPlugin extends Plugin {
  constructor (...args) {
    super(...args)
    this.addSub(`apm:${this.constructor.name}:log`, (arg) => {
      // TODO rather than checking this every time, setting it ought to enable/disable any plugin
      // extending from this one
      if (this.tracer._logInjection) {
        const holder = {}
        this.tracer.inject(storage.getStore().span, LOG, holder)
        arg.message = messageProxy(arg.message, holder)
      }
    })
  }
}
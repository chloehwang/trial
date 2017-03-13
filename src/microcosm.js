import Action          from './action'
import Emitter         from './emitter'
import History         from './history'
import Realm           from './realm'
import Archive         from './archive'
import createEffect    from './create-effect'
import tag             from './tag'
import coroutine       from './coroutine'
import getRegistration from './get-registration'

import {
  RESET,
  PATCH,
  BIRTH
} from './lifecycle'

import {
  backfill,
  merge,
  inherit,
  get,
  set,
  update
} from './utils'

function Microcosm (options, state, deserialize)  {
  Emitter.call(this)

  options = options || {}

  this.parent = options.parent || null

  this.history = this.parent ? this.parent.history : new History(options.maxHistory)
  this.history.addRepo(this)

  this.realm = new Realm(this)
  this.archive = new Archive()

  this.initial = this.parent ? this.parent.initial : {}
  this.state = this.parent ? this.parent.state : this.initial

  this.follower = !!this.parent

  // Microcosm is now ready. Call the setup lifecycle method
  this.setup(options)

  // Track a dirty flag, this is useful so that we can reconcile
  // all Microcosm repos, then release their new state changes
  // progressively
  this.dirty = false

  // If given state, reset to that snapshot
  if (state) {
    this.reset(state, deserialize)
  }
}

inherit(Microcosm, Emitter, {

  setup () {
    // NOOP
  },

  teardown () {
    // Trigger a teardown event before completely shutting down
    this._emit('teardown', this)

    // Remove this repo from history
    this.history.removeRepo(this)

    // Remove all listeners
    this.removeAllListeners()
  },

  getInitialState () {
    return this.initial
  },

  recall (action) {
    console.assert(action, 'Unable to get ' + typeof action + ' action')

    return this.archive.get(action.id)
  },

  /**
   * Create the initial state snapshot for an action. This is
   * important so that, when rolling back to this action, it always
   * has a state value.
   * @param {Action} action - The action to generate a snapshot for
   */
  createInitialSnapshot (action) {
    let state = this.recall(action.parent)

    this.updateSnapshot(action, state)
  },

  /**
   * Update the state snapshot for a given action
   * @param {Action} action - The action to update the snapshot for
   */
  updateSnapshot (action, state) {
    this.archive.set(action.id, state)
  },

  /**
   * Remove the snapshot for a given action
   * @param {Action} action - The action to remove the snapshot for
   */
  removeSnapshot (action) {
    console.assert(action, 'Unable to remove ' + typeof action + ' action.')

    this.archive.remove(action.id)
  },

  dispatch (state, action) {
    let handlers = this.realm.register(action)
    let current = state

    for (var i = 0, len = handlers.length; i < len; i++) {
      var { key, domain, handler } = handlers[i]

      var last = get(state, key)
      var next = handler.call(domain, last, action.payload)

      current = set(current, key, next)
    }

    return current
  },

  reconcile (action) {
    if (this.follower) {
      return this
    }

    let next = backfill(this.recall(action.parent), this.initial)

    if (this.parent) {
      next = merge(next, this.parent.recall(action))
    }

    if (!action.disabled) {
      next = this.dispatch(next, action)
    }

    this.updateSnapshot(action, next)

    return this
  },

  prepareRelease () {
    let next = this.follower ? this.parent.state : this.recall(this.history.head)

    this.dirty = next !== this.state
    this.state = next
  },

  release (action) {
    if (this.dirty) {
      this.dirty = false
      this._emit('change', this.state)
    }

    this._emit('effect', action)
  },

  /**
   * Append an action to history and return it. This is used by push,
   * but also useful for testing action states.
   */
  append (command, status) {
    return this.history.append(command, status)
  },

  /**
   * Push an action into Microcosm. This will trigger the lifecycle for updating
   * state.
   */
  push (command, ...params) {
    let action = this.append(command)

    coroutine(action, action.command.apply(null, params), this)

    return action
  },

  prepare (...params) {
    return (...extra) => this.push(...params, ...extra)
  },

  addDomain (key, config, options) {
    let domain = this.realm.add(key, config, options)

    this.follower = false

    if (domain.getInitialState) {
      this.initial = set(this.initial, key, domain.getInitialState())
    }

    this.history.checkout()

    return domain
  },

  addEffect (config, options) {
    return createEffect(this, config, options)
  },

  reset (data, deserialize) {
    return this.push(RESET, data, deserialize)
  },

  patch (data, deserialize) {
    return this.push(PATCH, data, deserialize)
  },

  deserialize (payload) {
    let base = payload

    if (this.parent) {
      base = this.parent.deserialize(payload)
    } else if (typeof base === 'string') {
      base = JSON.parse(base)
    }

    return this.realm.invoke('deserialize', base, base)
  },

  serialize () {
    let base = this.parent ? this.parent.serialize() : {}

    return this.realm.invoke('serialize', this.state, base)
  },

  toJSON () {
    return this.serialize()
  },

  checkout (action) {
    this.history.checkout(action)

    return this
  },

  fork () {
    return new Microcosm({
      parent : this
    })
  }

})

export default Microcosm

export { Microcosm, Action, History, tag, get, set, update, merge, inherit, getRegistration }

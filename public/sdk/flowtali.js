/**
 * Flowtali Embed SDK
 * Embed Flowtali invoices, projects, receipts, and more in any website or SaaS product.
 *
 * Usage:
 *   const ft = Flowtali.init('pk_live_...', { appearance: { primaryColor: '#6366f1' } })
 *   ft.mount('#container', { view: 'invoices', token: 'eyJ...' })
 *   ft.on('invoice.created', (data) => console.log(data))
 */
;(function (global) {
  'use strict'

  var BASE_URL = ''  // auto-detected from script src, or set via Flowtali.config()

  function detectBaseUrl() {
    var scripts = document.querySelectorAll('script[src]')
    for (var i = 0; i < scripts.length; i++) {
      var src = scripts[i].src || ''
      if (src.includes('/sdk/flowtali.js')) {
        var url = new URL(src)
        return url.origin
      }
    }
    return window.location.origin
  }

  function buildIframeSrc(baseUrl, view, token, params) {
    var path = '/embed/' + encodeURIComponent(view)
    var qs = new URLSearchParams({ token: token })
    if (params) {
      Object.keys(params).forEach(function (k) {
        if (params[k] !== undefined && params[k] !== null) {
          qs.set(k, String(params[k]))
        }
      })
    }
    return baseUrl + path + '?' + qs.toString()
  }

  function createIframe(src) {
    var iframe = document.createElement('iframe')
    iframe.src = src
    iframe.style.cssText = 'border:none;width:100%;height:100%;display:block;'
    iframe.allow = 'same-origin'
    iframe.setAttribute('data-flowtali', '1')
    return iframe
  }

  function FlowtaliInstance(publishableKey, options) {
    this._pk = publishableKey
    this._options = options || {}
    this._listeners = {}
    this._iframe = null
    this._container = null
    this._overlay = null
    this._ready = false
    this._pendingTheme = null

    var self = this

    window.addEventListener('message', function (event) {
      var data = event.data
      if (!data || typeof data !== 'object') return

      if (data.type === 'FLOWTALI_READY') {
        self._ready = true
        if (self._pendingTheme) {
          self._sendTheme(self._pendingTheme)
          self._pendingTheme = null
        }
      }

      if (data.type === 'FLOWTALI_EVENT' && data.event) {
        var handlers = self._listeners[data.event] || []
        handlers.forEach(function (fn) { fn(data.data) })
        var allHandlers = self._listeners['*'] || []
        allHandlers.forEach(function (fn) { fn(data.event, data.data) })
      }
    })
  }

  FlowtaliInstance.prototype._sendTheme = function (appearance) {
    if (this._iframe && this._iframe.contentWindow) {
      this._iframe.contentWindow.postMessage({ type: 'FLOWTALI_THEME', appearance: appearance }, '*')
    }
  }

  FlowtaliInstance.prototype.mount = function (selector, mountOptions) {
    var opts = mountOptions || {}
    var container = typeof selector === 'string' ? document.querySelector(selector) : selector

    if (!container) {
      console.error('[Flowtali] Container not found:', selector)
      return this
    }

    this.destroy()

    var baseUrl = BASE_URL || detectBaseUrl()
    var src = buildIframeSrc(baseUrl, opts.view || 'invoices', opts.token || '', opts.params)
    var iframe = createIframe(src)

    container.innerHTML = ''
    container.appendChild(iframe)

    this._iframe = iframe
    this._container = container
    this._ready = false

    var appearance = (opts.appearance || this._options.appearance)
    if (appearance) {
      this._pendingTheme = appearance
    }

    return this
  }

  FlowtaliInstance.prototype.open = function (openOptions) {
    var opts = openOptions || {}

    this.destroy()

    var overlay = document.createElement('div')
    overlay.style.cssText = [
      'position:fixed;inset:0;z-index:9999;',
      'background:rgba(0,0,0,0.6);',
      'display:flex;align-items:center;justify-content:center;',
    ].join('')

    var modal = document.createElement('div')
    modal.style.cssText = [
      'position:relative;width:90vw;max-width:1100px;height:85vh;',
      'border-radius:12px;overflow:hidden;',
    ].join('')

    var closeBtn = document.createElement('button')
    closeBtn.innerHTML = '&times;'
    closeBtn.style.cssText = [
      'position:absolute;top:10px;right:12px;z-index:1;',
      'background:rgba(0,0,0,0.4);border:none;cursor:pointer;',
      'color:#fff;font-size:20px;line-height:1;padding:2px 8px;border-radius:4px;',
    ].join('')

    var self = this
    closeBtn.addEventListener('click', function () { self.destroy() })
    overlay.addEventListener('click', function (e) { if (e.target === overlay) self.destroy() })

    var baseUrl = BASE_URL || detectBaseUrl()
    var src = buildIframeSrc(baseUrl, opts.view || 'invoices', opts.token || '', opts.params)
    var iframe = createIframe(src)

    modal.appendChild(closeBtn)
    modal.appendChild(iframe)
    overlay.appendChild(modal)
    document.body.appendChild(overlay)

    this._iframe = iframe
    this._overlay = overlay
    this._ready = false

    var appearance = (opts.appearance || this._options.appearance)
    if (appearance) {
      this._pendingTheme = appearance
    }

    return this
  }

  FlowtaliInstance.prototype.on = function (event, handler) {
    if (!this._listeners[event]) {
      this._listeners[event] = []
    }
    this._listeners[event].push(handler)
    return this
  }

  FlowtaliInstance.prototype.off = function (event, handler) {
    if (!this._listeners[event]) return this
    this._listeners[event] = this._listeners[event].filter(function (fn) { return fn !== handler })
    return this
  }

  FlowtaliInstance.prototype.destroy = function () {
    if (this._overlay) {
      this._overlay.remove()
      this._overlay = null
    }
    if (this._container) {
      this._container.innerHTML = ''
      this._container = null
    }
    this._iframe = null
    this._ready = false
    return this
  }

  var Flowtali = {
    config: function (opts) {
      if (opts.baseUrl) BASE_URL = opts.baseUrl
    },
    init: function (publishableKey, options) {
      return new FlowtaliInstance(publishableKey, options)
    },
  }

  // UMD export
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Flowtali
  } else {
    global.Flowtali = Flowtali
  }
})(typeof window !== 'undefined' ? window : this)

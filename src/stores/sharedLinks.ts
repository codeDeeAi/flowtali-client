import { ref } from 'vue'
import { defineStore } from 'pinia'
import 'pinia-plugin-persistedstate'

export interface ViewLogEntry {
  timestamp: string
  country: string
  browser: string
}

export interface SharedLink {
  id: string
  token: string
  resourceType: 'invoice' | 'letterhead'
  resourceId: number
  resourceName: string
  label: string
  visibility: 'public' | 'private'
  accessCode: string
  expiresAt: string | null
  createdAt: string
  isActive: boolean
  views: number
  uniqueViews: number
  lastViewedAt: string | null
  viewLog: ViewLogEntry[]
}

function generateToken(): string {
  return Math.random().toString(36).slice(2, 8) + Math.random().toString(36).slice(2, 8)
}

function generateCode(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase()
}

export const useSharedLinksStore = defineStore(
  'shared-links',
  () => {
    const links = ref<SharedLink[]>([])

    function forResource(type: 'invoice' | 'letterhead', id: number): SharedLink[] {
      return links.value.filter(l => l.resourceType === type && l.resourceId === id)
    }

    function byToken(token: string): SharedLink | null {
      return links.value.find(l => l.token === token) ?? null
    }

    function isExpired(link: SharedLink): boolean {
      if (!link.expiresAt) return false
      return new Date(link.expiresAt) < new Date()
    }

    function createLink(payload: {
      resourceType: 'invoice' | 'letterhead'
      resourceId: number
      resourceName: string
      label: string
      visibility: 'public' | 'private'
      accessCode?: string
      validityDays: number | null
    }): SharedLink {
      const expiresAt = payload.validityDays
        ? new Date(Date.now() + payload.validityDays * 86_400_000).toISOString()
        : null

      const link: SharedLink = {
        id: generateToken(),
        token: generateToken(),
        resourceType: payload.resourceType,
        resourceId: payload.resourceId,
        resourceName: payload.resourceName,
        label: payload.label || '',
        visibility: payload.visibility,
        accessCode:
          payload.visibility === 'private' ? (payload.accessCode?.trim() || generateCode()) : '',
        expiresAt,
        createdAt: new Date().toISOString(),
        isActive: true,
        views: 0,
        uniqueViews: 0,
        lastViewedAt: null,
        viewLog: [],
      }
      links.value.push(link)
      return link
    }

    function revokeLink(id: string): void {
      const link = links.value.find(l => l.id === id)
      if (link) link.isActive = false
    }

    function deleteLink(id: string): void {
      links.value = links.value.filter(l => l.id !== id)
    }

    function recordView(token: string): void {
      const link = links.value.find(l => l.token === token)
      if (!link) return
      link.views++
      link.uniqueViews++
      link.lastViewedAt = new Date().toISOString()
      link.viewLog.unshift({
        timestamp: new Date().toISOString(),
        country: 'Unknown',
        browser: navigator?.userAgent?.includes('Chrome')
          ? 'Chrome'
          : navigator?.userAgent?.includes('Firefox')
            ? 'Firefox'
            : navigator?.userAgent?.includes('Safari')
              ? 'Safari'
              : 'Other',
      })
      if (link.viewLog.length > 50) link.viewLog = link.viewLog.slice(0, 50)
    }

    return { links, forResource, byToken, isExpired, createLink, revokeLink, deleteLink, recordView }
  },
  { persist: true },
)

import { CAMPAIGNS_STORAGE_PREFIX, getCampaignsStorageKey } from '~/constants/storage'
import type { CampaignLog } from '~/types/business/campaign'

function emptyCampaigns(): CampaignLog {
  return { entries: [], syncMoneyToCurrency: false }
}

function cloneCampaigns(value: CampaignLog): CampaignLog {
  return JSON.parse(JSON.stringify(value)) as CampaignLog
}

export const useCampaignStore = defineStore('campaign', () => {
  const cache = ref(new Map<string, CampaignLog>())

  function load(characterId: string): CampaignLog {
    const cached = cache.value.get(characterId)
    if (cached) return cloneCampaigns(cached)
    const stored = getLocalStorage<CampaignLog>(getCampaignsStorageKey(characterId))
    const value = stored ?? emptyCampaigns()
    cache.value.set(characterId, value)
    return cloneCampaigns(value)
  }

  function save(characterId: string, value: CampaignLog): boolean {
    const previous = cache.value.get(characterId) ?? emptyCampaigns()
    const next = cloneCampaigns(value)
    cache.value.set(characterId, next)
    if (!setLocalStorage(getCampaignsStorageKey(characterId), next)) {
      cache.value.set(characterId, previous)
      return false
    }
    return true
  }

  function remove(characterId: string): void {
    cache.value.delete(characterId)
    removeLocalStorage(getCampaignsStorageKey(characterId))
  }

  function removeAll(): void {
    cache.value.clear()
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i)
      if (key?.startsWith(CAMPAIGNS_STORAGE_PREFIX)) {
        localStorage.removeItem(key)
      }
    }
  }

  return {
    load,
    save,
    remove,
    removeAll,
  }
})

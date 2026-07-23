import { computed, ref } from 'vue'
import type { CollectibleSet } from '../types'
import { groupCollectibles, type CollectibleGroup } from '../collectibleGroups'
import { useCollection } from './useCollection'

export interface SetGroups {
  set: CollectibleSet
  groups: CollectibleGroup[]
}

// Selection is a single module-scope ref (mirrors the singleton-state pattern
// used elsewhere) so it survives whichever component currently renders the
// detail panel, without needing to thread it through props.
const selectedCollectibleId = ref<string | null>(null)
const searchQuery = ref('')

export function useManagement() {
  const { sets } = useCollection()

  const groupedSets = computed<SetGroups[]>(() => {
    const query = searchQuery.value.trim().toLowerCase()
    return sets.value
      .map((set) => ({
        set,
        groups: groupCollectibles(set.collectibles).filter((g) =>
          query ? g.name.toLowerCase().includes(query) : true,
        ),
      }))
      .filter((s) => s.groups.length > 0)
  })

  const selectedGroup = computed<{ set: CollectibleSet; group: CollectibleGroup } | null>(() => {
    const id = selectedCollectibleId.value
    if (!id) return null
    for (const { set, groups } of groupedSets.value) {
      const group = groups.find((g) => g.variants.some((v) => v.id === id))
      if (group) return { set, group }
    }
    return null
  })

  function select(collectibleId: string) {
    selectedCollectibleId.value = collectibleId
  }

  return { groupedSets, selectedGroup, selectedCollectibleId, searchQuery, select }
}

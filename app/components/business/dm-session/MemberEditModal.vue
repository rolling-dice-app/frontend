<template>
  <Modal
    :model-value="open"
    :title="t('dmSession.container.editMembers')"
    size="md"
    bg-color="var(--color-canvas-elevated)"
    text-color="var(--color-content)"
    border-color="var(--color-border)"
    @update:model-value="(value: boolean) => emit('update:open', value)"
  >
    <div class="space-y-3">
      <p class="text-xs text-content-muted">
        {{ t('dmSession.container.field.members') }}
        <span class="ml-1 tabular-nums">{{ draft.length }}/{{ max }}</span>
      </p>

      <ul v-if="draft.length > 0" role="list" class="space-y-2">
        <li
          v-for="member in draft"
          :key="member.id"
          class="rounded-md border border-border-soft bg-surface p-3"
        >
          <div class="flex items-center gap-2">
            <CommonAppInput
              :model-value="member.playerName"
              size="sm"
              outline
              :maxlength="CHARACTER_TEXT_LIMITS.SHORT"
              :placeholder="t('dmSession.member.playerName')"
              :aria-label="t('dmSession.member.playerName')"
              class="w-full flex-1"
              @update:model-value="(value: string) => (member.playerName = value)"
            />
            <button
              type="button"
              :aria-label="`${t('ui.action.delete')} ${member.playerName}`"
              class="flex size-8 shrink-0 items-center justify-center rounded-md text-content-faint transition-colors duration-150 hover:text-danger-hover"
              @click="onRemoveRow(member.id)"
            >
              <Icon name="trash" :size="14" />
            </button>
          </div>

          <!-- 角色卡欄：已連結顯示預覽 chip，未連結顯示分享連結輸入 -->
          <div v-if="member.character" class="mt-2 flex items-center gap-1.5">
            <span
              class="inline-flex items-center gap-1.5 rounded-full border border-border-soft bg-surface-2 px-2 py-0.5 text-xs"
              :class="member.character.available ? 'text-content' : 'text-content-muted'"
            >
              <img
                v-if="member.character.available && member.character.avatar"
                :src="member.character.avatar"
                :alt="member.character.name ?? ''"
                class="size-4 rounded-full object-cover"
                loading="lazy"
              />
              <span
                v-else
                aria-hidden="true"
                class="flex size-4 items-center justify-center rounded-full bg-surface-raised text-content-muted"
              >
                <Icon name="user" :size="10" />
              </span>
              <span class="max-w-40 truncate">
                {{
                  member.character.available
                    ? (member.character.name ?? member.character.shareId)
                    : t('dmSession.member.unavailable')
                }}
              </span>
              <button
                type="button"
                :aria-label="t('dmSession.member.unlinkAction')"
                class="flex size-4 items-center justify-center rounded-full text-content-muted hover:text-danger"
                @click="member.character = null"
              >
                <Icon name="close" :size="10" />
              </button>
            </span>
          </div>
          <div v-else class="mt-2 flex items-center gap-2">
            <CommonAppInput
              :model-value="linkInputs[member.id] ?? ''"
              size="sm"
              outline
              :placeholder="t('dmSession.member.linkPlaceholder')"
              :aria-label="t('dmSession.member.characterLink')"
              :disabled="resolving"
              class="w-full flex-1"
              @update:model-value="(value: string) => (linkInputs[member.id] = value)"
            />
            <CommonAppButton
              type="button"
              variant="secondary"
              size="sm"
              :disabled="resolving || !(linkInputs[member.id] ?? '').trim()"
              @click="onLink(member)"
            >
              {{ t('dmSession.member.linkAction') }}
            </CommonAppButton>
          </div>
        </li>
      </ul>

      <button
        type="button"
        :disabled="atMax"
        class="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-border px-3 py-2 text-sm text-content-muted transition-colors duration-150 hover:bg-surface hover:text-content disabled:cursor-not-allowed disabled:opacity-50"
        @click="onAddRow"
      >
        <Icon name="plus" :size="16" />
        {{ t('dmSession.member.add') }}
      </button>
    </div>

    <template #footer>
      <div class="flex justify-end gap-2">
        <CommonAppButton type="button" variant="ghost" @click="emit('update:open', false)">
          {{ t('ui.action.cancel') }}
        </CommonAppButton>
        <CommonAppButton type="button" variant="primary" :disabled="resolving" @click="onConfirm">
          {{ t('ui.action.confirm') }}
        </CommonAppButton>
      </div>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { toRaw } from 'vue'
import { Icon, Modal } from '@ui'
import { CHARACTER_TEXT_LIMITS, VALIDATION_LIMITS } from '@rolling-dice-app/core'
import type { DmSessionMemberDTO } from '@rolling-dice-app/core'
import { parseShareIdFromLink } from '~/helpers/share'

const { t } = useI18n()
const toast = useToast()
const apiErrorToast = useApiErrorToast()

const props = defineProps<{
  open: boolean
  members: DmSessionMemberDTO[]
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  confirm: [members: DmSessionMemberDTO[]]
}>()

const max = VALIDATION_LIMITS.maxMembersPerDmSessionContainer

const draft = ref<DmSessionMemberDTO[]>([])
/** 各未連結列的分享連結輸入值，key 為成員列 id */
const linkInputs = ref<Record<string, string>>({})
const resolving = ref(false)

watch(
  () => props.open,
  (next) => {
    if (!next) return
    draft.value = structuredClone(toRaw(props.members))
    linkInputs.value = {}
  },
  { immediate: true },
)

const atMax = computed(() => draft.value.length >= max)

const onAddRow = (): void => {
  if (atMax.value) return
  draft.value.push({ id: crypto.randomUUID(), playerName: '', character: null })
}

const onRemoveRow = (id: string): void => {
  draft.value = draft.value.filter((m) => m.id !== id)
}

const onLink = async (member: DmSessionMemberDTO): Promise<void> => {
  if (resolving.value) return
  const shareId = parseShareIdFromLink(linkInputs.value[member.id] ?? '')
  if (!shareId) {
    toast.error(t('dmSession.member.invalidLink'), { kind: 'hint' })
    return
  }
  if (draft.value.some((m) => m.character?.shareId === shareId)) {
    toast.info(t('dmSession.member.duplicate'), { kind: 'hint' })
    return
  }

  resolving.value = true
  try {
    const { previews } = await share().resolveSharedCharacters([shareId])
    const preview = previews[0]
    if (!preview) {
      toast.error(t('dmSession.member.resolveFailed'), { kind: 'hint' })
      return
    }
    member.character = preview
    linkInputs.value = { ...linkInputs.value, [member.id]: '' }
  } catch (err) {
    apiErrorToast.handle(err)
  } finally {
    resolving.value = false
  }
}

/** 名字修剪後為空且未連結角色的列視為未填，確認時丟棄 */
const onConfirm = (): void => {
  const cleaned = draft.value
    .map((m) => ({ ...m, playerName: m.playerName.trim() }))
    .filter((m) => m.playerName !== '' || m.character !== null)
  emit('confirm', cleaned)
  emit('update:open', false)
}
</script>

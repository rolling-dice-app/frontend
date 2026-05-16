<template>
  <div class="flex flex-col gap-8">
    <div :class="boxClass">
      <img
        v-if="displaySrc && !imgError"
        :src="displaySrc"
        alt=""
        class="h-full w-full object-cover"
        loading="lazy"
        @error="imgError = true"
      />
      <div
        v-else
        class="h-full w-full flex flex-col gap-2 items-center justify-center px-3 text-center text-xs text-content-muted"
      >
        <Icon name="plus" :size="60" class="cursor-pointer" @click="openFilePicker" />
        <span>{{ t('character.portrait.placeholderEmpty') }}</span>
      </div>
    </div>

    <CommonAppButton
      type="button"
      variant="danger"
      :disabled="uploading || !displaySrc"
      @click="handleRemove"
    >
      {{ t('character.portrait.remove') }}
    </CommonAppButton>

    <input ref="fileInputRef" type="file" accept="image/*" class="hidden" @change="onFileChange" />

    <Modal
      v-model="cropOpen"
      :title="t('character.portrait.cropTitle')"
      size="lg"
      bg-color="var(--color-canvas-elevated)"
      text-color="var(--color-content)"
      border-color="var(--color-border)"
      @update:model-value="onModalToggle"
    >
      <div class="h-[60vh]">
        <Cropper
          v-if="imageSrc"
          ref="cropperRef"
          :src="imageSrc"
          :stencil-component="stencilComponent"
          :stencil-props="{ aspectRatio: stencilAspectRatio }"
          image-restriction="fit-area"
          class="h-full w-full"
        />
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <CommonAppButton type="button" variant="ghost" :disabled="uploading" @click="cropCancel">
            {{ t('character.portrait.cancel') }}
          </CommonAppButton>
          <CommonAppButton
            type="button"
            variant="primary"
            :disabled="uploading"
            @click="cropConfirm"
          >
            {{ uploading ? t('character.portrait.uploading') : t('character.portrait.confirm') }}
          </CommonAppButton>
        </div>
      </template>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { Modal, Icon } from '@ui'
import { Cropper, CircleStencil, RectangleStencil } from 'vue-advanced-cropper'

const PREFLIGHT_MAX_BYTES = 5 * 1024 * 1024
const WEBP_QUALITY = 0.85

const PORTRAIT_OUTPUT = { width: 768, height: 1024 }
const AVATAR_OUTPUT = { width: 512, height: 512 }

/**
 * immediate（傳 uploadFn）：裁切完即上傳並原子套用，avatar model 反映新 URL。
 * deferred（未傳 uploadFn）：blob 經 pendingBlob model 交外層於資源建立後上傳。
 */
const props = defineProps<{
  uploadFn?: (blob: Blob) => Promise<string>
  deleteFn?: () => Promise<void>
  /** portrait：3:4 直式矩形（預設）。avatar：1:1 圓形帳號頭像。 */
  shape?: 'portrait' | 'avatar'
}>()

const isAvatar = computed(() => props.shape === 'avatar')

const boxClass = computed(() =>
  isAvatar.value
    ? 'aspect-square mx-auto w-48 max-w-full overflow-hidden border border-primary rounded-full bg-canvas-inset'
    : 'aspect-3/4 w-full overflow-hidden border border-primary rounded-md bg-canvas-inset',
)

const stencilComponent = computed(() => (isAvatar.value ? CircleStencil : RectangleStencil))
const stencilAspectRatio = computed(() => (isAvatar.value ? 1 : 3 / 4))
const outputSize = computed(() => (isAvatar.value ? AVATAR_OUTPUT : PORTRAIT_OUTPUT))

// immediate 模式 uploadFn / deleteFn 必須成對：移除若不打後端會造成「看似刪除實際沒持久化」
if (props.uploadFn && !props.deleteFn) {
  throw new Error('PortraitUploader: deleteFn is required when uploadFn is provided')
}

const avatar = defineModel<string | null>({ required: true })
const pendingBlob = defineModel<Blob | null>('pendingBlob', { default: null })

const { t } = useI18n()
const toast = useToast()
const apiErrorToast = useApiErrorToast()

const isImmediate = computed(() => typeof props.uploadFn === 'function')

const fileInputRef = ref<HTMLInputElement | null>(null)
const cropperRef = ref<InstanceType<typeof Cropper> | null>(null)
const imageSrc = ref<string | null>(null)
const cropOpen = ref(false)
const uploading = ref(false)

/** deferred 模式本地預覽（pendingBlob 的 objectURL）；與 server avatar URL 互斥優先。 */
const pendingPreview = ref<string | null>(null)
const displaySrc = computed(() => pendingPreview.value ?? avatar.value)

/** 圖片載入失敗（R2 URL 尚未傳播 / 404）時退回空狀態占位，而非破圖。 */
const imgError = ref(false)
watch(displaySrc, () => {
  imgError.value = false
})

const clearPendingPreview = () => {
  if (pendingPreview.value) {
    URL.revokeObjectURL(pendingPreview.value)
    pendingPreview.value = null
  }
}

const setPendingPreview = (blob: Blob) => {
  clearPendingPreview()
  pendingPreview.value = URL.createObjectURL(blob)
}

const releaseImageSrc = () => {
  if (imageSrc.value) {
    URL.revokeObjectURL(imageSrc.value)
    imageSrc.value = null
  }
}

const resetFileInput = () => {
  if (fileInputRef.value) fileInputRef.value.value = ''
}

const openFilePicker = () => {
  resetFileInput()
  fileInputRef.value?.click()
}

const isImageFile = (file: File): boolean => file.type.startsWith('image/')

const passesPreflight = (file: File): boolean => {
  if (!isImageFile(file)) {
    toast.error(t('character.portrait.invalidType'))
    return false
  }
  if (file.size > PREFLIGHT_MAX_BYTES) {
    toast.error(t('character.portrait.fileTooLarge'))
    return false
  }
  return true
}

const onFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return
  if (!passesPreflight(file)) {
    resetFileInput()
    return
  }
  releaseImageSrc()
  imageSrc.value = URL.createObjectURL(file)
  cropOpen.value = true
}

const onModalToggle = (open: boolean) => {
  cropOpen.value = open
  if (!open) {
    releaseImageSrc()
    resetFileInput()
  }
}

const cropCancel = () => {
  if (uploading.value) return
  cropOpen.value = false
}

const drawToOutputCanvas = (sourceCanvas: HTMLCanvasElement): HTMLCanvasElement => {
  const { width, height } = outputSize.value
  const out = document.createElement('canvas')
  out.width = width
  out.height = height
  const ctx = out.getContext('2d')
  if (!ctx) throw new Error('canvas 2d context unavailable')
  ctx.drawImage(sourceCanvas, 0, 0, width, height)
  return out
}

const canvasToWebp = (canvas: HTMLCanvasElement): Promise<Blob> =>
  new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error('canvas.toBlob returned null'))
      },
      'image/webp',
      WEBP_QUALITY,
    )
  })

const cropConfirm = async () => {
  if (uploading.value) return
  const cropper = cropperRef.value
  if (!cropper) return
  const result = cropper.getResult()
  if (!result.canvas) {
    toast.error(t('character.portrait.uploadFailed'))
    return
  }

  uploading.value = true
  try {
    const output = drawToOutputCanvas(result.canvas)
    const blob = await canvasToWebp(output)
    if (isImmediate.value) {
      const url = await props.uploadFn!(blob)
      avatar.value = url
      clearPendingPreview()
    } else {
      setPendingPreview(blob)
      pendingBlob.value = blob
    }
    cropOpen.value = false
    releaseImageSrc()
    resetFileInput()
  } catch (err) {
    apiErrorToast.handle(err)
  } finally {
    uploading.value = false
  }
}

const handleRemove = async () => {
  if (uploading.value) return
  if (!isImmediate.value) {
    clearPendingPreview()
    pendingBlob.value = null
    return
  }
  if (avatar.value === null) return
  uploading.value = true
  try {
    await props.deleteFn!()
    avatar.value = null
    clearPendingPreview()
  } catch (err) {
    apiErrorToast.handle(err)
  } finally {
    uploading.value = false
  }
}

onBeforeUnmount(() => {
  releaseImageSrc()
  clearPendingPreview()
})
</script>

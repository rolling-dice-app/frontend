<template>
  <div class="flex flex-col gap-2">
    <div class="aspect-3/4 w-full overflow-hidden border border-primary rounded-md bg-canvas-inset">
      <img v-if="avatar" :src="avatar" alt="" class="h-full w-full object-cover" loading="lazy" />
      <div
        v-else
        class="h-full w-full flex flex-col gap-2 items-center justify-center px-3 text-center text-xs text-content-muted"
      >
        <Icon name="plus" :size="60" class="cursor-pointer" @click="openFilePicker" />
        <span>{{ t('character.portrait.placeholderEmpty') }}</span>
      </div>
    </div>

    <Button
      type="button"
      :radius="4"
      bg-color="var(--color-danger)"
      :disabled="uploading || !avatar"
      @click="handleRemove"
    >
      {{ t('character.portrait.remove') }}
    </Button>

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
          :stencil-props="{ aspectRatio: 3 / 4 }"
          image-restriction="fit-area"
          class="h-full w-full"
        />
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <Button
            type="button"
            :radius="4"
            bg-color="var(--color-surface-2)"
            :disabled="uploading"
            @click="cropCancel"
          >
            {{ t('character.portrait.cancel') }}
          </Button>
          <Button
            type="button"
            :radius="4"
            bg-color="var(--color-primary)"
            :disabled="uploading"
            @click="cropConfirm"
          >
            {{ uploading ? t('character.portrait.uploading') : t('character.portrait.confirm') }}
          </Button>
        </div>
      </template>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { Button, Modal, Icon } from '@ui'
import { Cropper } from 'vue-advanced-cropper'

const PREFLIGHT_MAX_BYTES = 5 * 1024 * 1024
const OUTPUT_WIDTH = 768
const OUTPUT_HEIGHT = 1024
const WEBP_QUALITY = 0.85

const avatar = defineModel<string | null>({ required: true })

const { t } = useI18n()
const toast = useToast()
const apiErrorToast = useApiErrorToast()

const fileInputRef = ref<HTMLInputElement | null>(null)
const cropperRef = ref<InstanceType<typeof Cropper> | null>(null)
const imageSrc = ref<string | null>(null)
const cropOpen = ref(false)
const uploading = ref(false)

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
  const out = document.createElement('canvas')
  out.width = OUTPUT_WIDTH
  out.height = OUTPUT_HEIGHT
  const ctx = out.getContext('2d')
  if (!ctx) throw new Error('canvas 2d context unavailable')
  ctx.drawImage(sourceCanvas, 0, 0, OUTPUT_WIDTH, OUTPUT_HEIGHT)
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
    const url = await uploads().avatar(blob)
    avatar.value = url
    cropOpen.value = false
    releaseImageSrc()
    resetFileInput()
  } catch (err) {
    apiErrorToast.handle(err)
  } finally {
    uploading.value = false
  }
}

const handleRemove = () => {
  avatar.value = null
}

onBeforeUnmount(() => {
  releaseImageSrc()
})
</script>

<template>
  <!-- 第一部分，Auth页面和About页面跳转 -->
  <UCard class="mx-auto mt-4 max-w-sm">
    <div class="flex justify-between items-center">
      <div class="flex justify-start items-center gap-4">
          <UButton icon="i-heroicons-inbox" color="gray" size="sm" to="/user" />
      </div>

      <!-- Auth 跳转按钮 -->
      <UButton
        color="gray"
        variant="solid"
        size="md"
        icon="i-fluent-cloud-16-regular"
      >
        <NuxtLink to="/auth" class="flex items-center gap-2"> 登录 </NuxtLink>
      </UButton>
    </div>
  </UCard>
</template>

<script setup lang="ts">
import { UButton } from '#components';
const toast = useToast()

const featureDeveloping = () => {
  toast.add({
    title: "功能开发中",
    description: "该功能正在开发中，敬请期待",
    color: "gray",
    timeout: 2000,
  })
}
</script>

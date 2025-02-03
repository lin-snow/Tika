<template>
    <UCard class="mx-auto mt-4 max-w-sm">
    <div class="flex justify-between items-center">
      <!-- 返回首页按钮 -->
      <div>
        <UButton
          to="/"
          variant="solid"
          color="gray"
          size="md"
          icon="i-fluent-home-12-regular"
        >
          返回
        </UButton>
      </div>
      <!-- github项目地址 -->
      <div>
        <UButton
            to="https://github.com/lin-snow/"
            target="_blank"
            variant="solid"
            color="gray"
            size="md"
            icon="i-line-md-github"
        />
      </div>
    </div>
  </UCard>
</template>
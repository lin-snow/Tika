<template>
    <UCard class="mx-auto mt-4 max-w-sm">
        <!-- 用户信息 -->
        <UCard>
            <UIcon name="i-fluent-emoji-flat-waving-hand" /> Hi! <span class="font-bold text-2xl">{{ userStore.username }} </span> .
            <div class="p-2">
                <span >您一共完成了</span> <span class="text-2xl font-bold italic">{{ userStore.numOfDone }}</span> 个任务。
                当前还剩下的任务有 <span class="text-2xl font-bold italic">{{ userStore.numOfUndone }}</span> 个。
            </div>
        </UCard>

        <!-- 关于本项目 -->
        <div class="p-4 text-center">
            <p class="text-sm font-light italic">Author: <a href="https://linsnow.cn"> L1nSn0w </a></p>
        </div>
    </UCard>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useUser } from '~/composables/useUser';
const { getUserStatus} = useUser();
const userStore = useUserStore();

onMounted(() => {
    getUserStatus();
})
</script>
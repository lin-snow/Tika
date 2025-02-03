import type { User } from '@/types/models'
import { ref } from 'vue'

export const useAuthStore = defineStore('authStore', () => {
    const user = ref<User | null>(null)

    // 仅在客户端环境读取 localStorage
    if (typeof window !== 'undefined') {
        const storedUser = localStorage.getItem("user")
        if (storedUser) {
            user.value = JSON.parse(storedUser)
        }
    }

    // 监听 user 变化，自动存入 localStorage（仅在客户端执行）
    watchEffect(() => {
        if (typeof window !== 'undefined') {
            if (user.value) {
                localStorage.setItem("user", JSON.stringify(user.value))
            } else {
                localStorage.removeItem("user")
            }
        }
    })

    const getUser = () => user.value
    const getToken = () => user.value?.token || null
    const isAuthenticated = () => !!user.value

    const setUser = (newUser: User) => {
        user.value = newUser
        localStorage.setItem("user", JSON.stringify(newUser))
    }

    const clearUser = () => {
        user.value = null
        localStorage.removeItem("user")
    }

    

    return { user, getUser, getToken, isAuthenticated, setUser, clearUser }
})

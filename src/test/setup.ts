import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// vitest 未开启 globals,Testing Library 的自动清理不会注册,需手动挂载
afterEach(cleanup)

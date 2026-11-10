import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { App } from './App'

describe('App 骨架', () => {
  it('渲染主标题', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: '日程看板' })).toBeInTheDocument()
  })
})

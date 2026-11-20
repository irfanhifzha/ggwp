import { useState } from 'react'
import { createId } from '../storage'
import type { PanelPatch, Todo, TodoPanel as TodoPanelData } from '../types'

interface TodoPanelProps {
  panel: TodoPanelData
  onPatch: (id: string, patch: PanelPatch) => void
}

interface Draft {
  title: string
  description: string
}

const EMPTY_DRAFT: Draft = { title: '', description: '' }

export function TodoPanel({ panel, onPatch }: TodoPanelProps) {
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT)
  const [error, setError] = useState('')

  const saveTodos = (todos: Todo[]) => onPatch(panel.id, { todos })

  const addTodo = () => {
    const title = draft.title.trim()
    if (!title) {
      setError('Give the task a title.')
      return
    }

    saveTodos([
      ...panel.todos,
      { id: createId(), title, description: draft.description.trim(), done: false },
    ])
    setDraft(EMPTY_DRAFT)
    setError('')
  }

  const toggleTodo = (id: string) => {
    saveTodos(
      panel.todos.map((todo) => (todo.id === id ? { ...todo, done: !todo.done } : todo)),
    )
  }

  return (
    <div className="todo-body">
      <form
        className="todo-form"
        onSubmit={(event) => {
          event.preventDefault()
          addTodo()
        }}
      >
        <input
          className="field"
          value={draft.title}
          aria-label="Task title"
          placeholder="What needs doing?"
          onChange={(event) => setDraft({ ...draft, title: event.target.value })}
        />
        <div className="todo-form-row">
          <input
            className="field"
            value={draft.description}
            aria-label="Task description"
            placeholder="Description (optional)"
            onChange={(event) => setDraft({ ...draft, description: event.target.value })}
          />
          <button type="submit" className="toolbar-button">
            Add
          </button>
        </div>
        {error && <p className="form-error">{error}</p>}
      </form>

      {panel.todos.length === 0 ? (
        <p className="panel-empty">Nothing on the list yet.</p>
      ) : (
        <ul className="todo-list">
          {panel.todos.map((todo) => (
            <li key={todo.id} className={`todo-item${todo.done ? ' todo-item-done' : ''}`}>
              <input
                type="checkbox"
                className="todo-check"
                checked={todo.done}
                aria-label={`Mark ${todo.title} as ${todo.done ? 'not done' : 'done'}`}
                onChange={() => toggleTodo(todo.id)}
              />
              <div className="todo-text">
                <p className="todo-title">{todo.title}</p>
                {todo.description && <p className="todo-description">{todo.description}</p>}
              </div>
              <button
                type="button"
                className="icon-button icon-button-danger"
                title="Delete task"
                aria-label={`Delete ${todo.title}`}
                onClick={() => saveTodos(panel.todos.filter((item) => item.id !== todo.id))}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

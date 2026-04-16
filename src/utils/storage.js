export function saveState(key, state) {
  localStorage.setItem(key, JSON.stringify(state))
}

export function loadState(key) {
  try {
    const state = localStorage.getItem(key)
    return state ? JSON.parse(state) : null
  } catch (error) {
    console.error(`Failed to parse saved state for key "${key}":`, error)
    return null
  }
}

export function getData(url) {
  return fetch(url).then((response) => {
    if (!response.ok) {
      throw new Error('Network response was not ok')
    }
    return response.json()
  })
}

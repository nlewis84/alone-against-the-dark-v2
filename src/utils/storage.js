export function saveState(key, state) {
  localStorage.setItem(key, JSON.stringify(state));
}

export function loadState(key) {
  const state = localStorage.getItem(key);
  return state ? JSON.parse(state) : null;
}

export function getData(url) {
  return fetch(url).then((response) => {
    if (!response.ok) {
      throw new Error("Network response was not ok");
    }
    return response.json();
  });
}

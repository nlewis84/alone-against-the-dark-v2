// jest.setup.js
require('jest-fetch-mock').enableMocks()

Object.defineProperty(window, 'location', {
  value: {
    ...window.location,
    reload: jest.fn(),
  },
  writable: true,
})

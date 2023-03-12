import { defineConfig } from "cypress"

export default defineConfig({
  e2e: {
    defaultCommandTimeout: 50000,
    baseUrl: "https://www.kiwi.com/",
  },
})

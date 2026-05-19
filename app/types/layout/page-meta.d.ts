declare module '#app' {
  interface PageMeta {
    /** 設 true 時 app.vue 會輸出 robots: noindex, nofollow（私有頁不進搜尋引擎索引）。 */
    noindex?: boolean
  }
}

export {}

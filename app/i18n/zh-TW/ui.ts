/**
 * 跨領域 UI 用詞：動詞 / 表單提示 / Auth / 通用訊息。領域專屬用詞請放
 * 對應 domain module（character / class / spell / combat / inventory）。
 */
export default {
  /** 通用動詞 */
  action: {
    save: '儲存',
    cancel: '取消',
    delete: '刪除',
    add: '新增',
    edit: '編輯',
    confirm: '確認',
    close: '關閉',
    back: '返回',
    reset: '重置',
    create: '建立',
    update: '更新',
    submit: '送出',
    enterDeleteMode: '進入刪除模式',
    leaveDeleteMode: '離開刪除模式',
    expand: '展開',
    collapse: '收合',
  },
  /** 表單提示 */
  form: {
    required: '必填',
    optional: '選填',
    selectPlaceholder: '請選擇',
    inputPlaceholder: '請輸入',
  },
  /** Auth 入口 / 流程 */
  auth: {
    login: '登入',
    logout: '登出',
    loginRequired: '請先登入後再訪問此頁',
    redirecting: '跳轉中...',
    authResult: '登入結果',
    backToHome: '返回首頁',
  },
  /** Toast / alert 通用訊息 */
  message: {
    saveSuccess: '已儲存',
    saveFailed: '儲存失敗，請稍後再試',
    systemError: '系統錯誤，請稍後再試',
    deleteFailed: '刪除失敗，請稍後再試',
    unknownError: '發生未知錯誤，請稍後再試',
    persistFailedDataMayLost: '更新失敗，重整後資料可能遺失',
    staleRecord: '資料已被更新，請重新整理',
  },
  /**
   * 後端錯誤 code → toast 訊息。只 cover「無法在前端 preempt」的 race / 環境 / cooldown 類；
   * 其他 code 走 ui.message.systemError generic。
   * 新增 race code → 同步 backend error-handling-conventions skill 內的「Frontend toast 同步」段。
   */
  error: {
    staleVersion: '資料已被其他來源更新，請重新整理',
    restoreCooldown: '角色剛還原不久，{minutes} 分鐘後才能再刪除',
    rateLimited: '操作過於頻繁，請稍後再試',
    serverError: '伺服器暫時無法回應，請稍後再試',
    network: '網路連線出問題，請檢查連線',
  },
  /** 三態 UI（loading / error / empty / retry） */
  state: {
    loading: '載入中...',
    retry: '重試',
    loadFailed: '載入失敗',
    networkErrorHint: '請稍後再試，或檢查網路連線。',
  },
  /** Aria-label / 共用螢幕閱讀器標籤 */
  aria: {
    backToParent: '返回上層',
    pageLoading: '頁面載入中',
    nav: '導覽',
  },
  /** Common navigation / drawer 提示 */
  nav: {
    swipeUp: '滑動開啟',
    workInProgress: '開發中',
    dmRelated: 'DM 相關',
    otherTools: '其他工具',
  },
  /** 找不到資源（共用版本；character.notFound 為角色專屬訊息） */
  notFound: {
    resource: '找不到此資源',
    backToHome: '返回首頁',
  },
  /** SEO meta 文案（全站預設，於 app.vue 使用） */
  seo: {
    siteDescription: 'Rolling Dice — 線上 D&D 角色卡管理與擲骰工具，建立、編輯並分享你的角色卡。',
  },
}

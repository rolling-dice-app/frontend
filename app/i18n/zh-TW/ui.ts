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
    saveFailed: '儲存失敗，請稍後再試',
    deleteFailed: '刪除失敗，請稍後再試',
    unknownError: '發生未知錯誤，請稍後再試',
  },
}

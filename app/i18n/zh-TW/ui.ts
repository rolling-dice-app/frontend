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
    editingNotAvailable: '編輯功能尚未開放',
    persistFailedDataMayLost: '更新失敗，重整後資料可能遺失',
  },
  /** 三態 UI（loading / error / empty / retry） */
  state: {
    loading: '載入中...',
    retry: '重試',
    loadFailed: '載入失敗',
    networkErrorHint: '請稍後再試，或檢查網路連線。',
  },
  /** 唯讀模式相關 banner / 提示 */
  readOnly: {
    detailBanner: '目前為唯讀模式，背包與冒險編輯尚未開放，待後端編輯端點上線後恢復。',
    updateBanner: '編輯功能尚未開放，目前僅供預覽，無法儲存修改。待後端編輯端點上線後恢復。',
    editTooltip: '編輯功能尚未開放',
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
}

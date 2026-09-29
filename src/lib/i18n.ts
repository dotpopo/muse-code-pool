export type Lang = "en" | "zh";

export const dict = {
  en: {
    title: "Take a code.\nLeave one behind.",
    subtitle:
      "Redeem someone else's Muse code and you both get 1 billion tokens. The pool rotates what's left, so one public post doesn't burn a code in minutes.",
    tagline: "Muse codes",
    inRotation: "in rotation",
    confirmed: "confirmed",
    getCode: "Get a code",
    poolEmpty: "Pool is empty",
    rotating: "Rotating…",
    nextHandout: "Next handout in",
    handoutHint: "Handouts favor codes with more estimated uses left.",
    yourCode: "Your code",
    copy: "Copy",
    copied: "Copied",
    redeemHint: (n: number) =>
      `Redeem in Muse → Settings → General. About ${n} uses estimated left.`,
    worked: "It worked",
    exhausted: "Used up — another",
    addPlaceholder: "Add your code",
    add: "Add",
    newest: "Newest codes",
    emptySlots: "Waiting for new codes",
    recent: "Recently handed out",
    latest: (n: number) => `Latest ${n}`,
    faq: "FAQ",
    footer:
      "Independent community pool. Not affiliated with Meta. Never pay for a code.",
    notices: {
      added: "In the pool. Thank you.",
      revived: "Back in rotation.",
      duplicate: "Already in the pool.",
      invalid: "Use 4–8 letters or numbers.",
      empty: "The pool is empty. Add a code to get it moving.",
      cooldown: "Codes rotate. Wait a moment, then take another.",
      rate: "Slow down — try again in a bit.",
      noCode: "No code in hand.",
      workedOk: "Nice — both of you get the tokens.",
      exhaustedOk: "Marked used up.",
    },
    faqItems: [
      {
        q: "What do I get?",
        a: "When the code is redeemed in Muse, you and the person who shared it each get 1 billion Muse tokens. Anything more specific is a rumor.",
      },
      {
        q: "Where do I enter it?",
        a: "In the Muse app or on the web: Settings → General → Redeem invite code. It has to happen within 48 hours of creating the account.",
      },
      {
        q: "The code was used up.",
        a: "Each code only works a limited number of times, often around 20 to 30. Mark it used up and we'll hand you a different one.",
      },
      {
        q: "Is this Meta?",
        a: "No. Independent pool. We never ask for a Muse or Meta login, and you should never pay for a code. Muse is currently US and Canada.",
      },
    ],
  },
  zh: {
    title: "领一个兑换码。\n留下一个兑换码。",
    subtitle:
      "兑换别人的 Muse 兑换码，你们双方各得 10 亿 Muse 代币。池子按剩余次数轮换，公开转发也不会几分钟就把码烧完。",
    tagline: "Muse 兑换码",
    inRotation: "个码在轮换",
    confirmed: "次确认成功",
    getCode: "领取兑换码",
    poolEmpty: "池子空了",
    rotating: "轮换中…",
    nextHandout: "下次可领",
    handoutHint: "优先发放剩余次数更多的兑换码。",
    yourCode: "你的兑换码",
    copy: "复制",
    copied: "已复制",
    redeemHint: (n: number) =>
      `在 Muse → 设置 → 通用 中兑换。预计剩余约 ${n} 次。`,
    worked: "兑换成功",
    exhausted: "已用完 — 换一个",
    addPlaceholder: "添加你的兑换码",
    add: "添加",
    newest: "最新兑换码",
    emptySlots: "等待新兑换码",
    recent: "最近发放",
    latest: (n: number) => `最新 ${n} 条`,
    faq: "常见问题",
    footer: "独立社区共享池。与 Meta 无关。请勿付费购买兑换码。",
    notices: {
      added: "已入池，谢谢！",
      revived: "重新进入轮换。",
      duplicate: "已在池中。",
      invalid: "请输入 4–8 位字母或数字。",
      empty: "池子空了。先添加一个兑换码吧。",
      cooldown: "兑换码在轮换，稍等片刻再领。",
      rate: "操作太频繁，请稍后再试。",
      noCode: "你手上没有待确认的码。",
      workedOk: "成功 — 双方都拿到代币。",
      exhaustedOk: "已标记用完。",
    },
    faqItems: [
      {
        q: "我能得到什么？",
        a: "在 Muse 中成功兑换后，你和分享者双方各得 10 亿 Muse 代币。更具体的说法都是谣言。",
      },
      {
        q: "在哪里输入？",
        a: "在 Muse 应用或网页版：设置 → 通用 → 兑换邀请码。须在创建账号 48 小时内完成。",
      },
      {
        q: "码被用完了。",
        a: "每个码可用次数有限，通常 20–30 次左右。标记已用完，我们会发给你另一个。",
      },
      {
        q: "这是 Meta 官方的吗？",
        a: "不是。独立社区共享池。我们不会索要 Muse 或 Meta 登录信息，也请勿付费购买。Muse 目前仅限美国和加拿大。",
      },
    ],
  },
} as const;

export type Dict = (typeof dict)["en"];

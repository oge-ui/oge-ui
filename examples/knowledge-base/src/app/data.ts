import type {
  OgeAccordionItemData,
  OgeTimelineItem,
} from 'oge-ui';

export type KbLocaleCode = 'en' | 'tr';
export type KbNavSectionId = 'articles' | 'guides' | 'feedback';

export interface KbNode {
  id: string;
  parentId: string | null;
  kind: 'folder' | 'article';
  title: string;
  category: string;
  author: string;
  updatedAt: string;
  readMinutes: number;
  contentHtml: string;
}

export interface KbGuideStepItem {
  key: string;
  label: string;
  description: string;
}

export interface KbReaderMetricRow {
  id: string;
  articleTitle: string;
  category: string;
  views30d: number;
  helpfulRatio: number;
  avgReadTimeMin: number;
  lastUpdated: string;
}

export interface KbUiStrings {
  appTitle: string;
  appSubtitle: string;
  exampleBadge: string;
  toggleDrawerAria: string;
  drawerAria: string;
  sidebarTitle: string;
  articlesDesc: string;
  guidesDesc: string;
  feedbackDesc: string;
  navArticles: string;
  navGuides: string;
  navFeedback: string;
  searchLabel: string;
  searchPlaceholder: string;
  langGroupAria: string;
  lightTheme: string;
  darkTheme: string;
  treeTitleColumn: string;
  treeUpdatedColumn: string;
  breadcrumbRoot: string;
  authorPrefix: string;
  updatedPrefix: string;
  readTimeSuffix: string;
  editorLabel: string;
  editorHint: string;
  revertButton: string;
  saveButton: string;
  guidesHeader: string;
  guidesSubheader: string;
  faqHeader: string;
  faqSubheader: string;
  timelineHeader: string;
  timelineSubheader: string;
  feedbackHeader: string;
  feedbackSubheader: string;
  savedToast: (title: string) => string;
  revertedToast: (title: string) => string;
  switchedLangToast: (langName: string) => string;
  footerNote: string;
}

export const UI_STRINGS: Record<KbLocaleCode, KbUiStrings> = {
  en: {
    appTitle: 'AtlasDocs Portal',
    appSubtitle: 'Enterprise Knowledge & Docs Suite',
    exampleBadge: 'OGE UI v1.1.6 · Angular 21',
    toggleDrawerAria: 'Toggle navigation drawer',
    drawerAria: 'Knowledge base navigation and documentation tree',
    sidebarTitle: 'Documentation',
    navArticles: 'Articles',
    navGuides: 'Guides',
    navFeedback: 'Telemetry',
    articlesDesc: 'Read and edit the knowledge base; every change is reviewed before it is published.',
    guidesDesc: 'Step-by-step runbooks, answers to common questions and the release history.',
    feedbackDesc: 'How readers use the documentation and which articles help the most.',
    searchLabel: 'Jump to article',
    searchPlaceholder: 'Search articles by title or topic…',
    langGroupAria: 'Interface language',
    lightTheme: 'Light',
    darkTheme: 'Dark',
    treeTitleColumn: 'Topic / Article',
    treeUpdatedColumn: 'Updated',
    breadcrumbRoot: 'AstraCloud Docs',
    authorPrefix: 'Maintained by',
    updatedPrefix: 'Last reviewed',
    readTimeSuffix: 'min read',
    editorLabel: 'Article body',
    editorHint:
      'Use the formatting toolbar or Markdown shortcuts (#, -, 1., >) to edit the selected article.',
    revertButton: 'Reset changes',
    saveButton: 'Save article',
    guidesHeader: 'Workspace provisioning runbook',
    guidesSubheader: 'Four steps from a fresh organization to live telemetry',
    faqHeader: 'Architecture & security',
    faqSubheader: 'Answers to the questions platform teams ask first',
    timelineHeader: 'Release history',
    timelineSubheader: 'What changed in the documentation, newest first',
    feedbackHeader: 'Readership',
    feedbackSubheader: 'Views, helpfulness and reading time over the last 30 days — select a row to open the article',
    savedToast: (title) => `Saved changes to "${title}".`,
    revertedToast: (title) => `Restored original content for "${title}".`,
    switchedLangToast: (langName) => `Switched component catalog and articles to ${langName}.`,
    footerNote: 'Built with OGE UI 1.1.6 · Angular 21',
  },
  tr: {
    appTitle: 'AtlasDocs Portalı',
    appSubtitle: 'Kurumsal Bilgi Bankası ve Dokümantasyon',
    exampleBadge: 'OGE UI v1.1.6 · Angular 21',
    toggleDrawerAria: 'Gezinme çekmecesini aç/kapat',
    drawerAria: 'Bilgi bankası menüsü ve dokümantasyon ağacı',
    sidebarTitle: 'Dokümantasyon',
    navArticles: 'Makaleler',
    navGuides: 'Rehberler',
    navFeedback: 'Analitik',
    articlesDesc: 'Bilgi bankasını okuyun ve düzenleyin; her değişiklik yayından önce incelenir.',
    guidesDesc: 'Adım adım kurulum rehberleri, sık sorulan sorular ve sürüm geçmişi.',
    feedbackDesc: 'Okuyucular dokümantasyonu nasıl kullanıyor, hangi makaleler en çok yardımcı oluyor.',
    searchLabel: 'Makaleye git',
    searchPlaceholder: 'Başlık veya konuya göre makale ara…',
    langGroupAria: 'Arayüz dili',
    lightTheme: 'Açık',
    darkTheme: 'Koyu',
    treeTitleColumn: 'Konu / Makale',
    treeUpdatedColumn: 'Güncelleme',
    breadcrumbRoot: 'AstraCloud Belgeleri',
    authorPrefix: 'Yazar:',
    updatedPrefix: 'Son inceleme:',
    readTimeSuffix: 'dk okuma',
    editorLabel: 'Makale içeriği',
    editorHint:
      'Seçili makaleyi düzenlemek için araç çubuğunu veya Markdown kısayollarını (#, -, 1., >) kullanın.',
    revertButton: 'Değişiklikleri sıfırla',
    saveButton: 'Makaleyi kaydet',
    guidesHeader: 'Çalışma alanı kurulum rehberi',
    guidesSubheader: 'Yeni bir organizasyondan canlı telemetriye dört adım',
    faqHeader: 'Mimari ve güvenlik',
    faqSubheader: 'Platform ekiplerinin ilk sorduğu soruların yanıtları',
    timelineHeader: 'Sürüm geçmişi',
    timelineSubheader: 'Dokümantasyonda neler değişti, en yeniden eskiye',
    feedbackHeader: 'Okunma',
    feedbackSubheader: 'Son 30 günde görüntülenme, faydalılık ve okuma süresi — makaleyi açmak için bir satır seçin',
    savedToast: (title) => `"${title}" makalesindeki değişiklikler kaydedildi.`,
    revertedToast: (title) => `"${title}" makalesi ilk haline döndürüldü.`,
    switchedLangToast: (langName) => `Bileşen kataloğu ve makaleler ${langName} diline geçirildi.`,
    footerNote: 'OGE UI 1.1.6 · Angular 21 ile oluşturuldu',
  },
};

export const KB_GUIDE_STEPS: Record<KbLocaleCode, readonly KbGuideStepItem[]> = {
  en: [
    {
      key: 'step-cli',
      label: '1. Install CLI & Authenticate',
      description: 'Configure Node 22.22 LTS and issue an organization token from the security console.',
    },
    {
      key: 'step-region',
      label: '2. Select Primary Region',
      description: 'Bind eu-central-1 or us-east-2 residency endpoints with automatic snapshot backups.',
    },
    {
      key: 'step-sso',
      label: '3. Enforce SAML 2.0 / OIDC',
      description: 'Connect Okta or Entra ID groups to AstraCloud RBAC roles and WebAuthn passkeys.',
    },
    {
      key: 'step-verify',
      label: '4. Verify Live Telemetry',
      description: 'Confirm sub-second Raft replication heartbeats across regional quorum peers.',
    },
  ],
  tr: [
    {
      key: 'step-cli',
      label: '1. CLI Kurulumu ve Kimlik Doğrulama',
      description: 'Node 22.22 LTS kurulumu ve güvenlik konsolundan organizasyon anahtarı üretimi.',
    },
    {
      key: 'step-region',
      label: '2. Birincil Veri Bölgesi Seçimi',
      description: 'eu-central-1 veya us-east-2 uç noktalarını otomatik anlık yedeklemeyle bağlama.',
    },
    {
      key: 'step-sso',
      label: '3. SAML 2.0 / OIDC Zorunluluğu',
      description: 'Okta veya Entra ID gruplarını AstraCloud RBAC rollerine ve geçiş anahtarlarına eşleme.',
    },
    {
      key: 'step-verify',
      label: '4. Canlı Telemetri Doğrulaması',
      description: 'Bölgesel çoğunluk düğümleri arasında saniye altı Raft replikasyon sinyallerini kontrol etme.',
    },
  ],
};

export const KB_FAQ_ITEMS: Record<KbLocaleCode, readonly OgeAccordionItemData[]> = {
  en: [
    {
      key: 'faq-1',
      title: 'How does OGE UI ship styles in Angular 21?',
      description:
        'All component styles are encapsulated inside standalone Angular components and driven by zero-specificity --oge-* CSS custom properties. Only @oge-ui/core/themes/dark.css is imported for dark mode.',
      expanded: true,
    },
    {
      key: 'faq-2',
      title: 'How does live locale switching work without reloading?',
      description:
        'provideOgeLocale(() => activeLang() === "tr" ? ogeTr : ogeEn) binds an Angular signal directly to every OGE UI component so labels, filter operators, and toolbars translate reactively.',
    },
    {
      key: 'faq-3',
      title: 'What happens when the sidebar collapses?',
      description:
        'OgeDrawer transitions smoothly from 340px to a 68px icon rail ([minSize]="68") so users can switch documentation views or jump to articles with a single click.',
    },
  ],
  tr: [
    {
      key: 'faq-1',
      title: 'OGE UI Angular 21 içinde stilleri nasıl sunar?',
      description:
        'Tüm bileşen stilleri bağımsız (standalone) Angular bileşenlerinin içinde kapsüllenir ve --oge-* CSS değişkenleriyle yönetilir. Koyu tema için yalnızca @oge-ui/core/themes/dark.css içe aktarılır.',
      expanded: true,
    },
    {
      key: 'faq-2',
      title: 'Sayfa yenilenmeden canlı dil geçişi nasıl çalışır?',
      description:
        'provideOgeLocale(() => activeLang() === "tr" ? ogeTr : ogeEn) bir Angular sinyalini doğrudan tüm OGE UI bileşenlerine bağlar; böylece filtreler ve araç çubukları anında çevrilir.',
    },
    {
      key: 'faq-3',
      title: 'Kenar çubuğu daraltıldığında (collapse) ne olur?',
      description:
        'OgeDrawer 340px genişlikten 68px ikon rayına ([minSize]="68") dönüşür; böylece kullanıcılar tek tıklamayla görünümler veya makaleler arasında geçiş yapabilir.',
    },
  ],
};

export const KB_CHANGELOG_TIMELINE: Record<KbLocaleCode, readonly OgeTimelineItem[]> = {
  en: [
    {
      key: 'rel-1',
      title: 'v1.1.6 Documentation Suite Published',
      description: 'Added bilingual English/Türkçe runbooks, rich-text Markdown shortcuts, and dark theme token reference.',
      time: 'Oct 22, 2026',
      severity: 'success',
    },
    {
      key: 'rel-2',
      title: 'Multi-Region Raft Replication Guide Audited',
      description: 'Verified sub-second RPO benchmarks across eu-central-1 and us-east-2 clusters.',
      time: 'Oct 20, 2026',
      severity: 'accent',
    },
    {
      key: 'rel-3',
      title: 'Token-Bucket Burst Playbook Updated',
      description: 'Added automated quota credit drawer workflow for customer SRE teams.',
      time: 'Oct 18, 2026',
      severity: 'warning',
    },
  ],
  tr: [
    {
      key: 'rel-1',
      title: 'v1.1.6 Dokümantasyon Paketi Yayınlandı',
      description: 'İki dilli İngilizce/Türkçe rehberler, Markdown kısayolları ve koyu tema değişken referansı eklendi.',
      time: '22 Eki 2026',
      severity: 'success',
    },
    {
      key: 'rel-2',
      title: 'Çok Bölgeli Raft Replikasyon Kılavuzu Denetlendi',
      description: 'eu-central-1 ve us-east-2 kümelerinde saniye altı RPO testleri doğrulandı.',
      time: '20 Eki 2026',
      severity: 'accent',
    },
    {
      key: 'rel-3',
      title: 'Jeton Kovası Trafik Rehberi Güncellendi',
      description: 'Müşteri SRE ekipleri için otomatik ek kredi tanımlama adımları eklendi.',
      time: '18 Eki 2026',
      severity: 'warning',
    },
  ],
};

export const KB_READER_METRICS: readonly KbReaderMetricRow[] = [
  {
    id: 'art-quickstart',
    articleTitle: 'Quickstart: Provisioning an AstraCloud Workspace',
    category: 'Onboarding',
    views30d: 4820,
    helpfulRatio: 97,
    avgReadTimeMin: 4.1,
    lastUpdated: '2026-10-18',
  },
  {
    id: 'art-tokens',
    articleTitle: 'Design Tokens & Dark Theme Architecture',
    category: 'Onboarding',
    views30d: 3910,
    helpfulRatio: 95,
    avgReadTimeMin: 3.2,
    lastUpdated: '2026-10-15',
  },
  {
    id: 'art-federation',
    articleTitle: 'Multi-Region Telemetry Replication',
    category: 'Platform',
    views30d: 2840,
    helpfulRatio: 92,
    avgReadTimeMin: 5.8,
    lastUpdated: '2026-10-20',
  },
  {
    id: 'art-sso',
    articleTitle: 'SAML 2.0 & OIDC Identity Federation',
    category: 'Security',
    views30d: 3490,
    helpfulRatio: 96,
    avgReadTimeMin: 4.9,
    lastUpdated: '2026-10-12',
  },
  {
    id: 'art-rate-limiting',
    articleTitle: 'Mitigating Burst Traffic with Token Buckets',
    category: 'Operations',
    views30d: 2190,
    helpfulRatio: 91,
    avgReadTimeMin: 3.9,
    lastUpdated: '2026-10-22',
  },
  {
    id: 'art-schema-migration',
    articleTitle: 'Zero-Downtime Schema Evolution Guide',
    category: 'Operations',
    views30d: 2630,
    helpfulRatio: 94,
    avgReadTimeMin: 5.1,
    lastUpdated: '2026-10-19',
  },
];

export const INITIAL_KB_NODES: Record<KbLocaleCode, KbNode[]> = {
  en: [
    {
      id: 'folder-getting-started',
      parentId: null,
      kind: 'folder',
      title: 'Getting Started',
      category: 'Onboarding',
      author: 'Platform Team',
      updatedAt: '2026-10-18',
      readMinutes: 0,
      contentHtml: '',
    },
    {
      id: 'art-quickstart',
      parentId: 'folder-getting-started',
      kind: 'article',
      title: 'Quickstart: Provisioning an AstraCloud Workspace',
      category: 'Onboarding',
      author: 'Elena Rostova',
      updatedAt: '2026-10-18',
      readMinutes: 4,
      contentHtml: `<h2>Provisioning Your First AstraCloud Workspace</h2>
<p>Welcome to <strong>AstraCloud</strong>, a fictional multi-region telemetry platform used to demonstrate <em>OGE UI</em> components. Every workspace isolates its ingestion pipelines, retention policies, and role-based access controls.</p>
<h3>Prerequisites</h3>
<ul>
  <li>Node.js <strong>22.22 LTS</strong> or newer installed on your workstation</li>
  <li>An active organization token generated from the Fictional Security Console</li>
  <li>Network egress to synthetic region endpoints (<code>eu-central-1</code> or <code>us-east-2</code>)</li>
</ul>
<h3>Step-by-Step Setup</h3>
<ol>
  <li>Initialize the workspace manifest in your project folder.</li>
  <li>Select a primary residency region and enable automated snapshot backups.</li>
  <li>Verify heartbeats in the live stream inspector within 30 seconds.</li>
</ol>
<blockquote>Tip: Switch the interface language between English and Türkçe in the top bar to see every OGE UI component — including the rich-text editor toolbar, tree list, and breadcrumb — update immediately without reloading the page.</blockquote>`,
    },
    {
      id: 'art-tokens',
      parentId: 'folder-getting-started',
      kind: 'article',
      title: 'Design Tokens & Dark Theme Architecture',
      category: 'Onboarding',
      author: 'Marcus Vance',
      updatedAt: '2026-10-15',
      readMinutes: 3,
      contentHtml: `<h2>Zero-Specificity CSS Custom Properties</h2>
<p>All visual surfaces in this portal are styled through <code>--oge-*</code> CSS custom properties. Component styles ship directly inside each Angular component, so no global CSS reset is required.</p>
<h3>Core Token Overrides</h3>
<ul>
  <li><code>--oge-accent</code> controls primary actions, active tree rows, and focus rings.</li>
  <li><code>--oge-radius-lg</code> adjusts container rounding across cards, modals, and inputs.</li>
  <li><code>--oge-row-height</code> tunes row density in both the Data Grid and Tree List.</li>
</ul>
<p>Toggling dark mode simply flips <code>class="oge-theme-dark"</code> on the root <code>&lt;html&gt;</code> element once <code>@oge-ui/core/themes/dark.css</code> is imported.</p>`,
    },
    {
      id: 'folder-architecture',
      parentId: null,
      kind: 'folder',
      title: 'Architecture & Security',
      category: 'Platform',
      author: 'Core Systems',
      updatedAt: '2026-10-20',
      readMinutes: 0,
      contentHtml: '',
    },
    {
      id: 'art-federation',
      parentId: 'folder-architecture',
      kind: 'article',
      title: 'Multi-Region Telemetry Replication',
      category: 'Platform',
      author: 'Sora Takahashi',
      updatedAt: '2026-10-20',
      readMinutes: 6,
      contentHtml: `<h2>Active-Active Replication Across Regions</h2>
<p>AstraCloud replicates event streams across three fictional availability zones using deterministic Raft consensus and compressed columnar segments.</p>
<h3>Replication Guarantees</h3>
<ul>
  <li><strong>Sub-second RPO:</strong> Write batches commit to two quorum peers before acknowledging the producer.</li>
  <li><strong>Deterministic Ordering:</strong> Hybrid logical clocks preserve causal ordering across regions.</li>
  <li><strong>Zero-Downtime Failover:</strong> Traffic drains automatically when health probes detect elevated tail latency.</li>
</ul>
<p>Operators can inspect per-partition lag directly from the regional health dashboard.</p>`,
    },
    {
      id: 'art-sso',
      parentId: 'folder-architecture',
      kind: 'article',
      title: 'SAML 2.0 & OIDC Identity Federation',
      category: 'Security',
      author: 'Amina Al-Mansoor',
      updatedAt: '2026-10-12',
      readMinutes: 5,
      contentHtml: `<h2>Configuring Enterprise Single Sign-On</h2>
<p>Workspace administrators can enforce hardware-backed WebAuthn passkeys and short-lived OIDC tokens for every engineering team.</p>
<h3>Supported Claims</h3>
<ol>
  <li><code>groups</code> — maps identity provider groups to AstraCloud RBAC roles.</li>
  <li><code>department</code> — tags audit trail entries for cost-center attribution.</li>
  <li><code>amr</code> — verifies multi-factor authentication assurance level prior to production deploys.</li>
</ol>
<blockquote>Security Note: All sample records in this knowledge base are 100% fictional and exist solely in browser memory.</blockquote>`,
    },
    {
      id: 'folder-playbooks',
      parentId: null,
      kind: 'folder',
      title: 'Incident Playbooks',
      category: 'Operations',
      author: 'SRE Guild',
      updatedAt: '2026-10-22',
      readMinutes: 0,
      contentHtml: '',
    },
    {
      id: 'art-rate-limiting',
      parentId: 'folder-playbooks',
      kind: 'article',
      title: 'Mitigating Burst Traffic with Token Buckets',
      category: 'Operations',
      author: 'Lukas Lindqvist',
      updatedAt: '2026-10-22',
      readMinutes: 4,
      contentHtml: `<h2>Adaptive Token-Bucket Rate Limiting</h2>
<p>When a tenant's ingestion pipeline exceeds its provisioned quota, edge gateways apply a hierarchical token-bucket policy that prioritizes critical alerts over verbose debug logs.</p>
<h3>Remediation Checklist</h3>
<ul>
  <li>Verify whether the spike originates from a single SDK client version.</li>
  <li>Enable temporary burst credits in the tenant quota drawer if a planned migration is underway.</li>
  <li>Export the rate-limit summary to share with the customer's platform lead.</li>
</ul>`,
    },
    {
      id: 'art-schema-migration',
      parentId: 'folder-playbooks',
      kind: 'article',
      title: 'Zero-Downtime Schema Evolution Guide',
      category: 'Operations',
      author: 'Priya Nair',
      updatedAt: '2026-10-19',
      readMinutes: 5,
      contentHtml: `<h2>Rolling Out Backward-Compatible Schema Changes</h2>
<p>Always use the <strong>expand-and-contract</strong> pattern when evolving telemetry payloads so existing consumers continue operating without interruption.</p>
<ol>
  <li><strong>Expand:</strong> Add nullable fields and dual-write from producers.</li>
  <li><strong>Backfill:</strong> Run the background compaction job over historical partitions.</li>
  <li><strong>Contract:</strong> Remove deprecated readers once 100% of active clients have upgraded.</li>
</ol>`,
    },
  ],
  tr: [
    {
      id: 'folder-getting-started',
      parentId: null,
      kind: 'folder',
      title: 'Başlangıç Rehberi',
      category: 'Kurulum',
      author: 'Platform Ekibi',
      updatedAt: '2026-10-18',
      readMinutes: 0,
      contentHtml: '',
    },
    {
      id: 'art-quickstart',
      parentId: 'folder-getting-started',
      kind: 'article',
      title: 'Hızlı Başlangıç: AstraCloud Çalışma Alanı Oluşturma',
      category: 'Kurulum',
      author: 'Elena Rostova',
      updatedAt: '2026-10-18',
      readMinutes: 4,
      contentHtml: `<h2>İlk AstraCloud Çalışma Alanınızı Hazırlama</h2>
<p><em>OGE UI</em> bileşenlerini göstermek için tasarlanmış kurgusal çok bölgeli telemetri platformu <strong>AstraCloud</strong>'a hoş geldiniz. Her çalışma alanı veri akışlarını, saklama politikalarını ve rol tabanlı erişim kurallarını izole eder.</p>
<h3>Ön Koşullar</h3>
<ul>
  <li>Bilgisayarınızda kurulu Node.js <strong>22.22 LTS</strong> veya daha yeni bir sürüm</li>
  <li>Kurgusal Güvenlik Konsolu üzerinden oluşturulmuş etkin bir organizasyon anahtarı</li>
  <li>Sentetik bölge uç noktalarına ağ erişimi (<code>eu-central-1</code> veya <code>us-east-2</code>)</li>
</ul>
<h3>Adım Adım Kurulum</h3>
<ol>
  <li>Proje klasörünüzde çalışma alanı bildirim dosyasını başlatın.</li>
  <li>Birincil veri bölgesini seçin ve otomatik anlık yedeklemeleri etkinleştirin.</li>
  <li>30 saniye içinde canlı akış denetleyicisinde sinyal mesajlarını doğrulayın.</li>
</ol>
<blockquote>İpucu: Üst çubuktan arayüz dilini English ve Türkçe arasında değiştirdiğinizde zengin metin düzenleyici araç çubuğu, ağaç listesi ve içerik haritası dahil tüm OGE UI bileşenlerinin sayfa yenilenmeden anında güncellendiğini görebilirsiniz.</blockquote>`,
    },
    {
      id: 'art-tokens',
      parentId: 'folder-getting-started',
      kind: 'article',
      title: 'Tasarım Belirteçleri (Tokens) ve Koyu Tema Mimarisi',
      category: 'Kurulum',
      author: 'Marcus Vance',
      updatedAt: '2026-10-15',
      readMinutes: 3,
      contentHtml: `<h2>Sıfır Özgüllüklü CSS Özel Özellikleri</h2>
<p>Bu portaldeki tüm görsel yüzeyler <code>--oge-*</code> CSS değişkenleriyle biçimlendirilir. Bileşen stilleri doğrudan Angular bileşenlerinin içinde gelir; ek bir genel stil dosyası gerekmez.</p>
<h3>Temel Değişken Özelleştirmeleri</h3>
<ul>
  <li><code>--oge-accent</code> birincil düğmeleri, seçili ağaç satırlarını ve odak halkalarını belirler.</li>
  <li><code>--oge-radius-lg</code> kartlar, pencereler ve giriş alanlarındaki köşe yuvarlaklığını ayarlar.</li>
  <li><code>--oge-row-height</code> Veri Izgarası ve Ağaç Listesi satır yüksekliğini kontrol eder.</li>
</ul>
<p><code>@oge-ui/core/themes/dark.css</code> içe aktarıldıktan sonra kök <code>&lt;html&gt;</code> öğesine <code>class="oge-theme-dark"</code> eklemek koyu temayı etkinleştirmek için yeterlidir.</p>`,
    },
    {
      id: 'folder-architecture',
      parentId: null,
      kind: 'folder',
      title: 'Mimari ve Güvenlik',
      category: 'Platform',
      author: 'Çekirdek Sistemler',
      updatedAt: '2026-10-20',
      readMinutes: 0,
      contentHtml: '',
    },
    {
      id: 'art-federation',
      parentId: 'folder-architecture',
      kind: 'article',
      title: 'Çok Bölgeli Telemetri Replikasyonu',
      category: 'Platform',
      author: 'Sora Takahashi',
      updatedAt: '2026-10-20',
      readMinutes: 6,
      contentHtml: `<h2>Bölgeler Arası Aktif-Aktif Replikasyon</h2>
<p>AstraCloud, olay akışlarını deterministik Raft mutabakatı ve sıkıştırılmış sütunsal segmentler kullanarak üç kurgusal erişilebilirlik bölgesi arasında çoğaltır.</p>
<h3>Replikasyon Garantileri</h3>
<ul>
  <li><strong>Saniye Altı RPO:</strong> Yazma paketleri üreticiye onay dönmeden önce en az iki çoğunluk düğümüne işlenir.</li>
  <li><strong>Deterministik Sıralama:</strong> Hibrit mantıksal saatler bölgeler arası nedensel sırayı korur.</li>
  <li><strong>Kesintisiz Yedek Devreye Alma:</strong> Sağlık kontrolleri gecikme artışı tespit ettiğinde trafiği otomatik yönlendirir.</li>
</ul>
<p>Operatörler bölüm bazında gecikme değerlerini doğrudan bölgesel sağlık panelinden inceleyebilir.</p>`,
    },
    {
      id: 'art-sso',
      parentId: 'folder-architecture',
      kind: 'article',
      title: 'SAML 2.0 ve OIDC Kimlik Federasyonu',
      category: 'Güvenlik',
      author: 'Amina Al-Mansoor',
      updatedAt: '2026-10-12',
      readMinutes: 5,
      contentHtml: `<h2>Kurumsal Tek Oturum Açma (SSO) Yapılandırması</h2>
<p>Çalışma alanı yöneticileri tüm mühendislik ekipleri için donanım destekli WebAuthn geçiş anahtarlarını ve kısa ömürlü OIDC belirteçlerini zorunlu kılabilir.</p>
<h3>Desteklenen Öznitelikler</h3>
<ol>
  <li><code>groups</code> — kimlik sağlayıcı gruplarını AstraCloud RBAC rolleriyle eşleştirir.</li>
  <li><code>department</code> — denetim kaydı satırlarını maliyet merkezi takibi için etiketler.</li>
  <li><code>amr</code> — canlı ortam dağıtımlarından önce çok faktörlü doğrulama seviyesini denetler.</li>
</ol>
<blockquote>Güvenlik Notu: Bu bilgi bankasındaki tüm örnek kayıtlar %100 kurgusaldır ve yalnızca tarayıcı belleğinde tutulur.</blockquote>`,
    },
    {
      id: 'folder-playbooks',
      parentId: null,
      kind: 'folder',
      title: 'Operasyon Rehberleri',
      category: 'Operasyon',
      author: 'SRE Ekibi',
      updatedAt: '2026-10-22',
      readMinutes: 0,
      contentHtml: '',
    },
    {
      id: 'art-rate-limiting',
      parentId: 'folder-playbooks',
      kind: 'article',
      title: 'Jeton Kovası ile Ani Trafik Artışlarını Yönetme',
      category: 'Operasyon',
      author: 'Lukas Lindqvist',
      updatedAt: '2026-10-22',
      readMinutes: 4,
      contentHtml: `<h2>Uyarlanabilir Jeton Kovası Hız Sınırlaması</h2>
<p>Bir kiracının veri akışı tanımlanan kotayı aştığında uç ağ geçitleri kritik uyarıları ayrıntılı hata ayıklama günlüklerinin önüne koyan hiyerarşik bir jeton kovası politikası uygular.</p>
<h3>Müdahale Kontrol Listesi</h3>
<ul>
  <li>Artışın tek bir SDK istemci sürümünden kaynaklanıp kaynaklanmadığını doğrulayın.</li>
  <li>Planlı bir geçiş yürütülüyorsa kiracı kota çekmecesinden geçici ek kredi tanımlayın.</li>
  <li>Müşteri platform sorumlusuyla paylaşmak üzere hız sınırı özetini dışa aktarın.</li>
</ul>`,
    },
    {
      id: 'art-schema-migration',
      parentId: 'folder-playbooks',
      kind: 'article',
      title: 'Kesintisiz Şema Evrimi Kılavuzu',
      category: 'Operasyon',
      author: 'Priya Nair',
      updatedAt: '2026-10-19',
      readMinutes: 5,
      contentHtml: `<h2>Geriye Dönük Uyumlu Şema Değişikliklerini Yayınlama</h2>
<p>Mevcut tüketicilerin kesintisiz çalışmaya devam etmesi için telemetri şemalarını güncellerken her zaman <strong>genişlet ve daralt (expand-and-contract)</strong> desenini kullanın.</p>
<ol>
  <li><strong>Genişlet:</strong> Boş bırakılabilir alanları ekleyin ve üreticilerden çift yazma başlatın.</li>
  <li><strong>Geriye Dönük Doldur:</strong> Geçmiş bölümler üzerinde arka plan sıkıştırma görevini çalıştırın.</li>
  <li><strong>Daralt:</strong> Aktif istemcilerin %100'ü güncellendikten sonra eski okuyucuları kaldırın.</li>
</ol>`,
    },
  ],
};

# Production Flow Etkileşimden Derlemeye Mimari Haritası

Bu belge, mevcut Production Flow uygulamasının gerçek kod yollarını okuyarak hazırlanmıştır. Kaynak önceliği: UI kodu ve derleyici/validator kodu. Eski dökümanlarla çelişen yerlerde kod esas alınmıştır.

Ana kaynaklar:
- `ui/job-builder/index.html`
- `ui/job-builder/app.js`
- `prompt_system/compiler/buildPrompt.js`
- `prompt_system/compiler/resolveRefs.js`
- `prompt_system/compiler/validateCanonicalJob.js`
- `prompt_system/compiler/dryBatchCheck.js`
- `prompt_system/compiler/resolveEntity.js`
- `prompt_system/compiler/optionRegistry.js`
- `prompt_system/modules/*`
- `edit.js`

## 1. Ekran / panel özeti

### Hedef Girdiler
- Girdi kümesini seçer.
- Batch çalıştırmada hangi `inputSource` klasörünün kullanılacağını belirler.
- Review ve readiness tarafındaki çıktı sayısı hesabını dolaylı etkiler.

### Model / Konu
- Görünür model referans yüzeyi.
- Üst referans şeridi, kimlik modu ve birkaç temel model ayarı burada bulunur.
- Derleyiciyi doğrudan etkileyen asıl kanonik konu alanı `entities.subject` tarafıdır.
- Üst model referansı ve `Kimlik` kararı gerçek compile yoluna iner.
- `İfade`, `Duruş`, `Saç` seçimleri ise hâlâ çoğunlukla UI durumu taşır.

### Ürün / Giysi
- Garment davranışını ve garment detail ref alanlarını taşır.
- Doku / detay ve desen / baskı referansları kanonik `garment.detail_refs.*` alanlarına iner.
- Prompt’ta ürün sadakati ve faz-1 iyileştirme düzeyi davranışını etkiler.

### Stil / Aksesuar
- Gözlük, çanta, başlık, ayakkabı kararlarını yönetir.
- Görünür shell, accessory/headwear/footwear kanonik alanlarını sürer.
- Add / replace / remove / keep kararları ve reference authority buradan gelir.

### Kontrol / Review
- Kısa özet katmanıdır.
- Canlı `state.job`, `state.ui.*` ve bazı kanonik özetlerden kullanıcıya hızlı durum verir.
- Derleyici çalıştırmaz; özet üretir.

### Derleme İncelemesi
- Kanonik iş, compile özeti, bağlanan referanslar ve readiness uyarılarını özetler.
- Asıl veri kaynağı `state.compiledCanonicalJob`, `state.validation`, `state.readiness` ve görünür shell’den türetilen yardımcı özetlerdir.

### Varyasyonlar / Önizleme
- Batch sonucu önizleme ve varyasyon seçimi katmanıdır.
- Compile kararlarını değiştirmez; üretilen çıktıyı gösterir.

### Alt action dock
- `Derle`, `Kontrol`, `Çalıştır`, `İptal` aksiyonlarını taşır.
- Derleme/readiness/batch durumunu kompakt status pill olarak gösterir.
- Hazır değil durumunda engelleyici neden burada görünür.

## 2. Görünür UI kontrol envanteri

Bu bölüm yalnızca kullanıcının mevcut shell’de gördüğü kontrolleri kapsar. Gizli legacy form alanları ayrıca belirtilmiştir.

### Hedef Girdiler

| Görünür kontrol | UI etkisi | Değişen alan |
| --- | --- | --- |
| Girdi kümesi seçimi `#inputSource` | Aktif input set değişir | `state.job.inputSource` |
| `Girdi Kümesi Oluştur` | Input manager akışına yönlendirir | İş durumu değiştirmez |

Not:
- Görsel özet `#targetInputSummary`, seçili klasördeki görüntü sayısından türetilir.

### Model / Konu

| Görünür kontrol | UI etkisi | Değişen alan |
| --- | --- | --- |
| Üst model referans şeridi | Aktif model kaynağını ve bağlı referansı özetler | `state.ui.model.*` + kanonik `state.job.entities.subject.*` |
| `Referans Yükle` | Gerçek konu referansı yükler ve bağlar | registry `entities.subject.references`, sonra `state.job.entities.subject.reference_id` |
| Model referansı seçimi | Ana girdi modeli ile bağlı model referansı arasında seçim yapar | `state.job.entities.subject.reference_id`, dolaylı `source` |
| `Kimlik` seçimi | Kimlik davranışını değiştirir | `state.ui.model.identityMode`, gizli `subjectMode`, sonra `state.job.entities.subject.mode` |
| `İfade` seçimi | UI tarafında ifade preset’i uygular | `state.ui.model.aestheticEnhancements` |
| `Duruş` seçimi | UI tarafında posture preset’i uygular | `state.ui.model.physicalCorrections` |
| `Saç` seçimi | UI tarafında hair preset’i uygular | `state.ui.model.constraints` |
| `Model Detayları` aç/kapat | Alt detay panelini açar | `state.ui.model.detailsOpen` |
| Detay panelindeki pill’ler | UI-only corrections / enhancements / constraints seçimi | `state.ui.model.physicalCorrections`, `state.ui.model.aestheticEnhancements`, `state.ui.model.constraints` |

Kritik not:
- Üst model referans alanı artık gerçek konu referansı yoludur.
- Görünür seçim/yükleme akışı kanonik `entities.subject.reference_id` ve `entities.subject.source` alanlarını gerçekten besler.

### Ürün / Giysi

| Görünür kontrol | UI etkisi | Değişen alan |
| --- | --- | --- |
| `Ürün Davranışı` seçimi | Faz-1 ürün intent’i değişir | `state.ui.productIntent`, gizli `garmentMode`, sonra `state.job.entities.garment.{mode,refinement_level}` |
| Detayları aç/kapat | Doku / detay ve desen / baskı alanlarını açar | `state.ui.product.detailsOpen` |
| `Doku / Detay Referansı` textarea | Material ref listesi değişir | gizli `garmentMaterialRefs`, sonra `state.job.entities.garment.detail_refs.material` |
| `Desen / Baskı Referansı` textarea | Pattern ref listesi değişir | gizli `garmentPatternRefs`, sonra `state.job.entities.garment.detail_refs.pattern` |

### Stil / Aksesuar

Görünür aileler: `eyewear`, `bag`, `headwear`, `footwear`.

| Görünür kontrol | UI etkisi | Değişen alan |
| --- | --- | --- |
| Aile satırı aksiyonu | Add / replace / remove / keep benzeri karar | İlgili hidden control, sonra kanonik `mode` |
| `Kaynak` seçimi | `reference` vs `system` authority | İlgili hidden control, sonra kanonik `source` |
| `Yerleşim` seçimi | Kullanım bağlamı | İlgili hidden control, sonra kanonik `placement` |
| `Varyant` seçimi | Ürün alt tipi | İlgili hidden control, sonra kanonik `variant` |
| Asset thumb seçimi | Belirli ref asset bağlar | İlgili hidden control, sonra kanonik `asset_id` |
| Upload | Yeni asset yükleme akışını açar | Yükleme sonrası asset seçimi üzerinden kanonik `asset_id` |
| `Stil Detayları` | Açık styling panelini yönetir | `state.ui.styling.openFamily` |

### Kontrol / Review

| Görünür kontrol | UI etkisi | Değişen alan |
| --- | --- | --- |
| `Tam Özeti Gör` | İnceleme alanına kaydırır | Persisted state değiştirmez |

### Derleme / Kontrol / Çalıştır

| Görünür kontrol | UI etkisi | Etki |
| --- | --- | --- |
| `Derle` | Sunucuda compile çağırır | `/api/job-builder/compile` |
| `Kontrol` | Dry check/readiness çağırır | `/api/job-builder/dry-check` |
| `Çalıştır` | Batch run başlatır | `/api/job-builder/run-batch` |
| `İptal` | Aktif batch’i iptal eder | batch kayıtlarını günceller |

## 3. State mapping

## Hedef Girdiler
- Görünür kontrol: `#inputSource`
- Olay yolu: `bindStaticEvents()` -> `syncStateFromForm()`
- State alanı: `state.job.inputSource`
- Sonraki tüketim:
  - `runDryBatchCheck()` içinde input klasörü var mı ve görüntü var mı kontrolü
  - `edit.js` içinde batch input klasörü tarama
  - Review sayısı ve readiness mesajları

## Model / Konu

### Kimlik modu
- Görünür yol: `handleModelShellChange()`
- Yardımcılar:
  - `getIdentityModeSelectOptions()`
  - `getCanonicalSubjectModeFromIdentityMode()`
  - `syncStateFromForm()`
- State değişimi:
  - `state.ui.model.identityMode`
  - gizli `subjectMode`
  - ardından `state.job.entities.subject.mode`
- Tüketim:
  - `buildPrompt()` -> `modules/subject.js`
  - readiness / inspect summary

### Model referans seçimi
- Görünür kaynak: üst model strip + bazı hidden select alanları
- State değişimi:
  - gerçek compile alanı: `state.job.entities.subject.reference_id`
  - aktif kaynak alanı: `state.job.entities.subject.source`
  - çoklu id taşıyıcısı: `state.job.entities.subject.reference_ids`
  - UI preview alanı: `state.ui.model.identityReferenceName`, `state.ui.model.identityPreviewUrl`
- Yardımcılar:
  - `uploadSubjectReferenceFromModel()`
  - `derivePhaseOneSubjectEntity()`
  - `refreshSubjectReferenceSelectOptions()`
  - `syncStateFromForm()`
- Tüketim:
  - `resolveReferences()` -> `refs.subject`
  - `modules/subject.js`
  - `buildReferenceBindingSection()`
  - validator subject ref kuralları

### İfade / Duruş / Saç
- Görünür yol: `handleModelShellChange()`
- Yardımcılar:
  - `applyModelExpressionPreset()`
  - `applyModelPosturePreset()`
  - `applyModelHairPreset()`
- State değişimi:
  - `state.ui.model.aestheticEnhancements`
  - `state.ui.model.physicalCorrections`
  - `state.ui.model.constraints`
- Tüketim:
  - şimdilik yalnızca görünür shell / inspect / review özetleri
  - doğrudan kanonik `entities.subject` alanına inmediği için compile davranışını belirgin biçimde değiştirmez

## Ürün / Giysi

### Ürün davranışı
- Görünür yol: `handleProductShellInput()`
- State değişimi:
  - `state.ui.productIntent`
  - gizli `garmentMode`
  - `state.job.entities.garment.mode = preserve`
  - `state.job.entities.garment.refinement_level`
- Kanonik normalizasyon:
  - görünür `Koru` -> `refinement_level = preserve`
  - görünür `Minimal düzelt` -> `refinement_level = minimal`
  - görünür `Düzelt` -> `refinement_level = repair`
  - legacy `clean/restyle` değerleri normalize katmanında sırasıyla `minimal/repair` seviyesine çevrilir
- Tüketim:
  - `modules/garment.js`
  - `buildReviewSentence()`
  - inspect summary

### Doku / detay ve desen / baskı ref’leri
- Görünür yol: `handleProductShellInput()`
- State değişimi:
  - `state.job.entities.garment.detail_refs.material`
  - `state.job.entities.garment.detail_refs.pattern`
- Yardımcılar:
  - `parseList()`
  - `syncStateFromForm()`
- Tüketim:
  - `resolveReferences()`
  - `modules/garment.js`
  - `buildReferenceBindingSection()`
  - validator garment detail ref kontrolleri

## Stil / Aksesuar

### Gözlük / Çanta
- Görünür yol: `handleStylingAccordionChange()`, `applyVisibleStylingSelection()`
- State değişimi:
  - ara hidden alanlar üzerinden kanonik `state.job.entities.accessory.items[*]`
- Yardımcılar:
  - `buildPrimaryAccessoryItem()`
  - `getPrimaryAccessoryItem()`
  - `ensureStylingActionIsActive()`
- Tüketim:
  - `modules/accessory.js`
  - `resolveReferences()`
  - `buildReferenceBindingSection()`
  - validator accessory item kuralları

### Başlık
- State alanı:
  - `state.job.entities.headwear.mode`
  - `state.job.entities.headwear.source`
  - `state.job.entities.headwear.placement`
  - `state.job.entities.headwear.variant`
  - `state.job.entities.headwear.asset_id`
- Tüketim:
  - `modules/headwear.js`
  - `resolveReferences()`
  - validator headwear kuralları

### Ayakkabı
- State alanı:
  - `state.job.entities.footwear.mode`
  - `state.job.entities.footwear.source`
  - `state.job.entities.footwear.placement`
  - `state.job.entities.footwear.variant`
  - `state.job.entities.footwear.asset_id`
- Tüketim:
  - `modules/footwear.js`
  - `resolveReferences()`
  - validator footwear kuralları

## Derle / Kontrol / Çalıştır

### Derle
- Yol: `compileCurrentJob()`
- Girdi: `state.job`
- Çıktı state:
  - `state.compiledPrompt`
  - `state.compiledCanonicalJob`
  - `state.imageConfig`
  - `state.validation`
  - `state.lastCompileSucceeded`

### Kontrol
- Yol: `runDryBatchCheck()`
- Girdi: `state.job`
- Çıktı state:
  - `state.readiness`
- Tüketim:
  - `renderReadiness()`
  - `renderExecutionActions()`
  - inspect meta / summary

### Çalıştır
- Yol: `runBatch()`
- Girdi: `state.job`
- Sunucu tarafında compile + resolve refs + batch request assembly zinciri çalışır.

## 4. Kanonik mapping

Bu bölüm görünür UI kararlarının hangi kanonik alanlara indiğini özetler.

| UI ailesi | Kanonik alan |
| --- | --- |
| Hedef Girdiler | `inputSource` |
| Model kimlik modu | `entities.subject.mode` |
| Model kaynağı | `entities.subject.source` |
| Model referansı | `entities.subject.reference_id` |
| Ürün davranışı | `entities.garment.refinement_level` |
| Doku / detay refs | `entities.garment.detail_refs.material[]` |
| Desen / baskı refs | `entities.garment.detail_refs.pattern[]` |
| Ayakkabı | `entities.footwear.{mode,source,placement,variant,asset_id}` |
| Başlık | `entities.headwear.{mode,source,placement,variant,asset_id}` |
| Gözlük / Çanta | `entities.accessory.items[*]` |
| Çıktı profili | `entities.output_profile.{mode,profile}` |
| Sahne | `entities.scene.{mode,profile}` |
| Global negatif kurallar | `entities.global_negative_rules.{mode,items}` |

Ek notlar:
- Gözlük ve çanta, görünür shell’de ayrı satırlar olsa da kanonikte `accessory.items` içine yazılır.
- Başlık ve ayakkabı ayrı entity olarak kalır.
- Faz 1 ürün davranışında `entities.garment.mode` pratikte `preserve` kalır; görünür intent farkı `entities.garment.refinement_level` üzerinden taşınır.
- `scene`, `output_profile`, `global_negative_rules` halen kanonikte yaşar; mevcut shell’de görünür ana yüzeyde öne çıkarılmaz.

## 5. Compile / prompt etkisi

Compile zinciri:
1. `buildPrompt(jobInput)` çağrılır.
2. `resolveEntity.normalizeJob()` ile kanonik iş normalize edilir.
3. `buildCompilerIntentJob()` reference authority olmayan asset’lerin compile job üzerindeki authority ağırlığını budar.
4. `order.js` sırasıyla modüller çalışır:
   - `core`
   - `subject`
   - `garment`
   - `footwear`
   - `headwear`
   - `accessory`
   - `scene`
   - `output_profile`
   - `global_negative_rules`
5. Sonra:
   - `intent_binding`
   - `reference_binding`

### Model / Konu -> `modules/subject.js`
- `entities.subject.mode = preserve` ve `entities.subject.source = input` ise hedef girdideki model aktif kimlik kaynağı kabul edilir.
- `entities.subject.mode = preserve` ve `entities.subject.source = reference` ise bağlı model referansı aktif kimlik kaynağı kabul edilir.
- `entities.subject.mode = replace` ise bağlı model referansına doğru aktif kimlik değiştirme satırları eklenir.
- Subject reference kuralları yalnızca `source = reference` ve geçerli `reference_id` varsa eklenir.
- Görünür `İfade / Duruş / Saç` preset’leri bu modüle doğrudan inmez.

### Ürün / Giysi -> `modules/garment.js`
- Garment daima target/input ürünü authority kabul eder; serbest restyle üretilmez.
- `refinement_level = preserve` ise ürün şekli, deseni, baskısı, yazısı ve temel ürün kimliği güçlü biçimde korunur.
- `refinement_level = minimal` ise yalnızca hafif kontrollü temizlik ve katalog düzeyi düzeltme satırları eklenir.
- `refinement_level = repair` ise daha güçlü ama hâlâ ürün sadakatli profesyonel düzeltme satırları eklenir.
- `detail_refs.material[]` doku, yüzey, dikiş ve yakın plan ürün detayı sadakatini güçlendirir.
- `detail_refs.pattern[]` desen, baskı, logo, yazı, ölçek ve yerleşim sadakatini güçlendirir.

### Ayakkabı -> `modules/footwear.js`
- `preserve` / `replace` / `remove` davranışı prompt bloklarını değiştirir.
- `source = reference` ve geçerli `asset_id` varsa slot-specific reference authority uygulanır.
- `placement` ve `variant` ayak üzeri kullanım bağlamını etkiler.

### Başlık -> `modules/headwear.js`
- `preserve`, `add`, `replace`, `remove` davranışları ayrı bloklar üretir.
- `source = reference` ve `asset_id` varsa referans authority güçlenir.
- `placement` ve `variant` baş üstü kullanım bağlamını belirler.

### Gözlük / Çanta -> `modules/accessory.js`
- Her item ayrı accessory alt bölümü olarak compile edilir.
- `mode` add / replace / remove / preserve davranışını değiştirir.
- `source = reference` ve `asset_id` varsa aile bazlı ref authority uygulanır.
- `placement` item bağlamını belirler.

### Reference binding
- `buildReferenceBindingSection()` şu authority sırasını prompt metninde açıklar:
  - target image = garment / pose / framing authority
  - `subject.source = reference` ise subject refs = identity authority
  - garment material/pattern refs = detail fidelity authority
  - footwear/headwear/accessory refs = yalnızca etkin reference authority için scoped authority
- Accessory ref’lerinin kimlik taşımaması özellikle yazılır.

## 6. Referans / asset assembly

Request assembly’nin gerçek runtime uygulaması `edit.js` içindedir.

### Derleme sonrası ref çözümü
- `resolveReferences(canonicalJob, { rootDir })` şu grupları döndürür:
  - `subject[]`
  - `garment.material[]`
  - `garment.pattern[]`
  - `footwear[]`
  - `headwear[]`
  - `accessory[]` -> `{ family, variant, label, files }`

### Hangi alan hangi ref’i üretir

| Kanonik alan | Resolve sonucu |
| --- | --- |
| `entities.subject.reference_id` | `refs.subject[]` |
| `entities.garment.detail_refs.material[]` | `refs.garment.material[]` |
| `entities.garment.detail_refs.pattern[]` | `refs.garment.pattern[]` |
| `entities.footwear.asset_id` | `refs.footwear[]` |
| `entities.headwear.asset_id` | `refs.headwear[]` |
| `entities.accessory.items[*].asset_id` | `refs.accessory[*].files[]` |

### Resolve inclusion mantığı
- Subject refs yalnızca `entities.subject.source = reference` ve `reference_id` varsa eklenir.
- Garment detail refs yalnızca ilgili listeler doluysa eklenir.
- Footwear refs yalnızca `mode !== ignore` ve `asset_id` varsa çözülür.
- Headwear refs yalnızca `mode !== ignore/remove` ve `asset_id` varsa çözülür.
- Accessory refs yalnızca item `mode !== ignore/remove` ve `asset_id` varsa çözülür.

### Runtime request sırası
`edit.js -> buildRequestForImage()` sırası:
1. target input image
2. subject references
3. garment material detail references
4. garment pattern detail references
5. footwear references
6. headwear references
7. accessory references
8. son instruction satırı
9. compiled prompt, `systemInstruction` olarak ayrıca eklenir

Kritik uygulama notu:
- Son kullanıcı prompt’u request body’de `systemInstruction.parts[].text` olarak taşınır.
- Görsel authority girdileri `contents[0].parts[]` altında hedef görüntü ve ref fileData parçaları olarak gider.

## 7. Bloklayıcı / uyarı kuralları

Asıl readiness zinciri:
- `runDryBatchCheck()` ->
  - `validateCanonicalJob()`
  - `buildPrompt()`
  - `resolveReferences()`
  - input source klasör/doğrulama
- `ready = errors.length === 0`

### Bloklayıcı tipleri

#### Hedef girdiler
- input source klasörü yoksa hata
- klasörde desteklenen görüntü yoksa hata

#### Model / Konu
- `subject.mode = replace` ve `reference_id` boşsa hata
- `subject.source = reference` ve `reference_id` boşsa hata
- `subject.reference_id` varsa:
  - ad standardı geçersizse hata
  - registry’de yoksa warning
  - candidate dirs içinde bulunamazsa hata
- `subject.source = input` ve `reference_id` doluysa warning
- `subject.mode = preserve` ve ek model referansı yoksa bu artık normal/nötr durumdur

#### Ürün / Giysi
- `detail_refs.material` veya `detail_refs.pattern` array değilse hata
- listedeki ref id geçersiz / registry dışı / çözülemezse warning

#### Ayakkabı
- desteklenmeyen `variant/source/placement` hata
- `mode = replace` ve hem `asset_id` hem `variant` boşsa hata
- `mode = remove` ve `asset_id` doluysa hata
- `preserve` iken `asset_id` doluysa warning
- seçilen asset dosyası bulunamazsa hata veya warning zinciri

#### Başlık
- desteklenmeyen `variant/source/placement` hata
- `add/replace` iken hem `asset_id` hem `variant` boşsa warning
- `remove` iken `asset_id` doluysa hata
- `preserve` iken `asset_id` doluysa warning

#### Aksesuar item’ları
- desteklenmeyen `mode/family/placement/variant` hata
- `family` boş ama mode aktifse hata
- `add/replace` ve hem `asset_id` hem `variant` boşsa warning
- `remove` ve `asset_id` doluysa hata
- `preserve` iken `asset_id` doluysa warning

#### Sahne / çıktı profili / global negatif
- desteklenmeyen profile veya uygunsuz mode/profile kombinasyonları hata
- `global_negative_rules.items` array değilse hata

### UI’de mesaj kaynağı
- Ana kaynak:
  - `state.readiness.errors`
  - `state.readiness.warnings`
  - fallback: `state.validation.errors`, `state.validation.warnings`
- Çeviri katmanı:
  - `getPrimaryReadinessIssue()`
  - `getReadinessIssueDetail()`
- Göründüğü yüzeyler:
  - alt dock mesaj satırı
  - kontrol/readiness strip
  - inspect summary

### Yaygın UI -> readiness örnekleri
- Ayakkabı `Değiştir` + referans bağlanmadı -> engelleyici veya uyarı
- Başlık `Ekle/Değiştir` + geçerli ref yok -> warning
- Gözlük/çanta `replace/add` + asset seçilmedi -> warning
- input set klasörü boş -> engelleyici
- var olmayan subject ref id -> engelleyici

## 8. Bilinen mevcut boşluklar / tutarsızlıklar

### Model yüzeyi tam compile-parity değil
- Görünür `İfade`, `Duruş`, `Saç` seçimleri şu an çoğunlukla `state.ui.model.*` içinde yaşar.
- Bu alanlar doğrudan kanonik `entities.subject` veya başka compile modüllerine inmez.
- Sonuç: model shell’in gerçek compile etkisi bugün esas olarak `entities.subject.{mode,source,reference_id}` tarafındadır.

### Üst model yüzeyi artık gerçek source yoluna bağlı
- Görünür referans yükleme/seçme akışı artık `entities.subject.reference_id` ve `entities.subject.source` alanlarını gerçekten günceller.
- Preview alanı yardımcı görsel durum taşır; tek başına compile authority üretmez.

### Ürün davranışı artık gerçek kanonik intent yoluna bağlı
- Görünür `Koru / Minimal düzelt / Düzelt` seçimi artık doğrudan `entities.garment.refinement_level` alanına iner.
- `entities.garment.mode` legacy uyumluluk için sistemde kalsa da faz-1 ürün intent’i artık bu alan üzerinden taşınmaz.
- Eski `clean/restyle` kayıtları normalize katmanında yeni faz-1 seviyelerine çevrilir.

### Aksesuar yüzeyi kısmen geçişli
- Görünür shell yalnızca birincil `eyewear`, `bag`, `headwear`, `footwear` ailelerini taşır.
- Ek accessory item akışları hâlâ legacy/gizli state yolları üzerinden mümkündür.

### Subject tarafında faz-1 normalize katmanı var
- UI bootstrap ve varsayılan builder job artık nötr `input` kaynağıyla açılır.
- Kaydedilmiş eski işler `reference_id` taşıyorsa UI katmanı bunu faz-1 subject source kuralına göre normalize eder.
- Örnek/senaryo dosyaları yine de bilinçli subject referansları taşıyabilir.

### Review / Inspect bazı yerlerde UI-only state’e yaslanır
- Model kimlik özeti artık büyük ölçüde kanonik `entities.subject` alanından türetilir.
- Buna rağmen `İfade / Duruş / Saç` gibi alt shell seçimleri inspect/review içinde UI-only izler bırakabilir.

## 9. Güncel Ürün Kararları (Faz 1 Çalışma Notları)

Bu bölüm implementation haritasına eklenen güncel ürün karar notlarını içerir. Mevcut kod davranışını tarif etmez; yön ve öncelik notu olarak okunmalıdır.

### A. Üst kompozisyon kararı
- Üst ana trio:
  - Hedef Girdiler
  - Model / Konu
  - Stil / Aksesuar
- Bu üçlü aynı üst sistem içinde hizalı ve dengeli kalmalıdır.
- Ürün / Giysi bu üçlünün dördüncü yarışan kartı gibi davranmamalıdır.
- Ürün / Giysi, üst trio’nun altında çalışan kompakt bir bridge / control layer olarak ele alınmalıdır.

### B. Model / Konu — Faz 1 mantığı
- Faz 1’de Model / Konu alanı sade tutulacaktır.
- Üstte model referansı / model yükleme yüzeyi kalacaktır.
- Alt tarafta birkaç temel ayar kalacaktır.
- Şimdilik fazla geniş kimlik sistemi kurulmayacaktır.
- Referans görseldeki sade model alanı bu faz için yeterli kabul edilmiştir.

### C. Model kaynağı mantığı
- Eğer ekstra model referansı verilmezse, ana input görseldeki model baz alınır.
- Kullanıcının model ile ilgili seçimleri ana input görseldeki model üzerinde uygulanır.
- Eğer kullanıcı ekstra model referansı yüklerse/seçerse, sistem bu referans modeli baz almaya çalışır.
- Bu durumda compile/prompt tarafı referans modeli destekleyecek şekilde çalışmalıdır.

### D. Model kimlik davranışı
- Model tarafında ana karar ekseni şudur:
  - ana görseldeki modeli koru
  - referans modeli kullan / değiştir
- Referans model yüklendiğinde ve kullanıcı değiştir mantığına geçtiğinde, compile tarafında yüzü referanstan alıp geri kalan unsurları mümkün olduğunca koruyan destekleyici prompt mantığı gerekir.
- Kullanıcı `Koru` diyorsa mevcut model kimliği korunmalıdır.
- Kullanıcı ekstra model referansı yükleyip `onu koru` diyorsa, referans model mümkün olduğunca bozulmadan uyarlanmalıdır.

### E. Model ayarlarının hedef yapısı
- Model alt ayarları şu başlıklara evrilecektir:
  - Yüz
  - Beden
  - Poz
- Her biri için iyileştirme düzeyi mantığı düşünülmektedir:
  - Koru
  - Minimal iyileştir
  - Pro iyileştir
- Bu karar henüz tam uygulanmış nihai UI değildir, ancak yön bu şekilde netleşmiştir.

### F. Ürün / Giysi — Faz 1 mantığı
- Ana input görseldeki ürün için mutlaka `koru` davranışı bulunmalıdır.
- Bunun yanında ürün tarafında şu yön düşünülmektedir:
  - Koru
  - Minimal düzelt
  - Düzelt
- Şimdilik mevcut görünür kipler bu hedefe yaklaşacak şekilde evrilebilir.
- Ürün / Giysi alanı styling/accessory alanından ayrı tutulmalıdır.

### G. Ürün / Giysi referansları
- Ürün / Giysi içinde daha iyi sonuç almak için yakın plan referans yükleme ihtiyacı vardır.
- Özellikle:
  - desen
  - baskı / yazı
  - doku / detay
- gibi unsurlar için referans yüklenebilmelidir.
- İlk fazda bu ihtiyaç tek bir güçlü yüzeyde, örneğin `Desen / Detay Referansı` benzeri bir yapıda toplanabilir.
- İleride gerekirse doku/material ve desen/baskı ayrılaştırılabilir.

### H. 2 görsel = 1 ürün batch mantığı
- Bu konu halen büyük sistem konusu olarak açıktır.
- Faz 1 için düşünülen pratik yön:
  - kullanıcı batch’e girecek görselleri seçer
  - ilgili 2’li / ürün grubunu işaretler
  - o gruba uygulanacak referansı / preset’i seçer
  - batch’e ekler
  - sonra sıradaki ürün grubuna geçer
- Yani tam otomatik eşleme yerine kontrollü ürün grubu mantığı düşünülmektedir.

### I. Debug / Derleme İncelemesi önceliği
- Debug / Derleme İncelemesi şu an ana ürün konusu değildir.
- Bu alan şimdilik ikincil ve sakin kalmalıdır.
- Gerekirse ileride sadeleştirilmiş son kullanıcı versiyonu bırakılabilir.
- Faz 1 önceliği bu alanı büyütmek değil, ana akışı çalıştırmaktır.

### J. Varyasyonlar önceliği
- Varyasyonlar şu an ana konu değildir.
- İleride compare eklenmesi planlanmaktadır.
- Şimdilik bu alanı büyütmek öncelik değildir.

### K. Faz 1 öncelik sırası
- 1. Üst kompozisyonu düzeltmek
- 2. Model / Konu alanını sade ama gerçek davranışa bağlamak
- 3. Ürün / Giysi alanına gerçek referans yükleme mantığını yerleştirmek
- 4. Ürün grubu / batch yönünü netleştirmek
- 5. Sonra design polish ve diğer ileri davranışlar

### L. Not
- Bu bölüm karar notudur.
- Nihai uygulama detayı değildir.
- Kod ve compile davranışıyla çelişen yerlerde ayrıca implementation kararı gerekecektir.

# FinWise AI - VPS Öncesi Hazırlık Listesi

Bu doküman, VPS public IP gelmeden önce tamamlanabilen işleri toplar. Amaç, IP alındığı anda yalnızca DNS ve deploy adımlarına geçmektir.

## Şu an tamamlananlar

- Domain alınmış durumda.
- Mail hosting açılmış durumda.
- `lib/email.ts` Turhost SMTP yapısına uyarlanmış durumda.
- `.env.local` mail ve uygulama tarafı için hazırlanmış durumda.
- DNS tarafında mail kayıtları büyük ölçüde hazırlanmış durumda.

## VPS IP gelmeden önce yapılabilecek işler

### 1. Production env planını hazır tut

Gerekli değişkenler:

```env
DATABASE_URL=
NEXTAUTH_SECRET=
NEXTAUTH_URL=
NEXT_PUBLIC_APP_URL=
GEMINI_API_KEY=

EMAIL_PROVIDER="smtp"
SMTP_HOST="srvm01.turhost.com"
SMTP_PORT="465"
SMTP_SECURE="true"
SMTP_USER="info@finwiseai.com.tr"
SMTP_PASS="mail-parolan"
MAIL_FROM_EMAIL="info@finwiseai.com.tr"
MAIL_FROM_NAME="FinWise AI"
```

### 2. DNS kayıtlarını sabitle

Mail tarafı için kayıtlar:

- `A` `mail.finwiseai.com.tr` -> `185.15.41.136`
- `MX` `finwiseai.com.tr` -> `mail.finwiseai.com.tr`
- `TXT` `finwiseai.com.tr` -> `v=spf1 include:_spf2.trwww.com include:_spf.trwww.com -all`
- `CNAME` `webmail.finwiseai.com.tr` -> `srvm01.trwww.com`
- `CNAME` `autoconfig.finwiseai.com.tr` -> `discover.trwww.com`
- `SRV` `_autodiscover._tcp.finwiseai.com.tr` -> `discover.trwww.com`, `0`, `10`, `443`
- `TXT` `tz8DEB330D1271D3A._domainKey.finwiseai.com.tr` -> verilen DKIM değeri
- `TXT` `_dmarc.finwiseai.com.tr` -> `v=DMARC1; p=none; rua=mailto:info@finwiseai.com.tr`

### 3. Web kayıtlarını beklet

VPS IP gelmeden şu kaydı değiştirme:

- `A` `finwiseai.com.tr`

Bu kayıt siteyi VPS'e bağlamak için kullanılacak. IP gelince güncellenecek.

### 4. Deploy sırası notunu hazırla

VPS IP geldiğinde yapılacak sıra:

1. VPS IP'yi al
2. Root `A` kaydını VPS IP'ye çevir
3. `npm install`
4. `npx prisma generate`
5. `npx prisma db push`
6. `npm run build`
7. `npm start` veya `pm2` ile çalıştır
8. SSL'yi Let’s Encrypt ile aç

## Mail tarafı için kritik not

Mail şifresi DNS'ten alınmaz. Panelde açılan posta kutusunun parolası kullanılır. Uygulamada SMTP gönderimi bu parola ile çalışır.

## Şu an yapılmaması gerekenler

- VPS IP olmadan root `A` kaydını rastgele değiştirme
- DNS kayıtlarını uydurma değerlerle doldurma
- Mail şifresini GitHub'a yazma
- Uygulamayı production'a yönlendirmeden önce `NEXTAUTH_URL` ve `DATABASE_URL`'i gerçek değerlerle değiştirmeme

## Son kontrol

VPS geldiğinde bu dokümanda sadece şu satırlar değişecek:

- `A` `finwiseai.com.tr` -> yeni VPS IP
- production `DATABASE_URL`
- production `NEXTAUTH_URL`
- production `NEXT_PUBLIC_APP_URL`

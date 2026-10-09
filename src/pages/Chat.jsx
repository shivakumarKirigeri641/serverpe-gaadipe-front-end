import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import { useSession } from '../lib/session';
import { useLang } from '../lib/i18n.jsx';
import BuyDialog from '../components/BuyDialog.jsx';
import * as notify from '../lib/notify';
import { journey, interaction, scrollSource, onEnded } from '../lib/track';
import EmailVerify from '../components/EmailVerify.jsx';
import { saveBlob } from '../components/ui.jsx';

/**
 * THE GAADIPE CHAT (user, 2026-10-07: "a chat in the browser — better than
 * WhatsApp; the basic check without a phone number, then sign in for more; an
 * existing customer sees their WhatsApp conversation"). A full-screen, phone-
 * first page, installable as an app (public/manifest.webmanifest).
 *
 *   not signed in   a free basic check (back end: /site/api/chat/check — free
 *                   sources only, a few a day), then "sign in for more"
 *   signing in      mobile number → SMS code, inside the conversation
 *   signed in       "welcome back", their WhatsApp history above, checks run
 *                   as on /app/check; the full report opens the vehicle page
 *
 * Nothing about whether a number is a customer is said before its code is
 * verified (the sign-in answers every number the same).
 */

const T = {
  en: {
    /* ONE FREE LOOK FIRST (user, 2026-10-08: visitors came to type a vehicle
       number and left when asked for their phone). The first check needs no
       sign-in and shows make and model; the rest, and a second check, after it. */
    hello: 'Namaste! 🙏 Welcome to *GaadiPe* — the complete record of any vehicle registered in India.\n\nInsurance, PUC, road tax and fitness validity, pending challans, loan (hypothecation), blacklist status and number of owners — from Government VAHAN and e-Challan records, with a downloadable PDF report.\n\n*Type a vehicle number to start* — like *KA01AB1234*. Your first check is free, no sign-in needed.',
    // When every check needs a sign-in (check_sign_in_required, 2026-10-08).
    // Sign in first, then the vehicle (user, 2026-10-08: asking for a number and
    // then for a mobile "may be a bit weird") — the greeting asks for the mobile.
    /* A WELCOME, NOT A FORM (user, 2026-10-08: people read the opening, saw a
       box to tick and left). What GaadiPe is, then one step: sign in. Agreement
       is by signing in, said in one small line under it — no tick. */
    /* THE WHOLE OFFER, BEFORE ANYTHING IS ASKED (user, 2026-10-08: "first
       conversation: what GaadiPe is, the basic details we show, what ₹19 shows —
       fully described — then 'start checking vehicles by signing in'; then it is
       up to the user"). No vehicle details at all without signing in. */
    // The short opening (user, 2026-10-08: 110+ visitors, most gone in 10 seconds) — the full text is one tap away.
    helloShort: 'Namaste! 🙏 *GaadiPe* shows any Indian vehicle’s insurance, PUC, challans, loan and owners — from Government records.\n'
      + 'Free check after sign-in · full report *₹19* with PDF.\n'
      + '*Sign in with your mobile to start* 👇',
    // The free check before sign-in (2026-10-08, migration 142).
    helloFree: 'Namaste! 🙏 I’m *GaadiPe* — I read any Indian vehicle’s record from Government data.\n'
      + '*Type any vehicle number below* 👇 and I’ll tell you its make and model *free*, no sign-in (the exact variant shows after you sign in).\n'
      + 'Want everything — insurance, PUC, challans, loan, owners? Full report *₹19*.',
    free: {
      // GaadiPe talking (user, 2026-10-08: "make the conversation look like GaadiPe replying, attractive").
      ask: (r) => `Great — let’s look up *${r}* 🔎\nOne quick thing before I do:`,
      foundIntro: (r) => `Here you go! ✨ This is what Government records say about *${r}*:`,
      nudge: '💡 Buying this vehicle? The ₹19 report shows if there’s a *loan*, *pending challans*, *expired insurance or PUC* and *how many owners* — before you pay the seller.',
      consentH: (r) => `Check ${r}`,
      consent: 'By continuing you agree to GaadiPe’s Terms of use, Privacy policy and Refund policy, and confirm you are checking this vehicle for a lawful purpose (for example buying it, or it is your own). Your device and network details are recorded with this check.',
      agree: '✅ Agree & check',
      links: ['Terms of use', 'Privacy policy', 'Refund policy'],
      found: '✅ Found in Government records',
      hidden: 'Model variant hidden — sign in free to see the full model and variant.',
      inReport: '*Sign in free* to see every validity date — insurance, PUC, road tax, fitness — and how many challans. *Full report ₹19:* loan, blacklist & NOC, every challan with amount, number of owners, a clear verdict, PDF + 28 days of alerts.',
      buy: (p) => `🔓 Get full report — ${p}`,
      more: 'This was today’s free check. *Sign in free* for every date and the challan count; *full report ₹19* for the loan, challan amounts and the verdict.',
      // When today's free check is used (the server's limit), in the visitor's language (2026-10-08).
      limit: '🔐 You’ve used today’s free check. Sign in with your mobile to check more — *basic details free* (make, model, variant, fuel, vehicle type), *full report ₹19*.',
      // A second number after today's free check (user, 2026-10-09: "say politely that 1 free check is done for the day").
      usedToday: (r) => `🙏 Sorry, today’s *1 free check* is already done.\n\nPlease *sign in* to check *${r}* and more vehicles — *basic details free* (make, model, variant, fuel, vehicle type), *full report ₹19*. I’ll check *${r}* right after you sign in.`,
      signIn: '🔐 Sign in to check more',
    },
    sample: { chip: '📄 See a sample report', more: '📋 Full details', intro: 'Here is what a full report looks like — on a *made-up vehicle*, so nothing real is shown 👇',
      badge: 'SAMPLE', ribbon: 'SAMPLE — made-up vehicle, not real data', cta: '🔐 Sign in to check your vehicle' },
    helloSignIn: 'Namaste! 🙏 Welcome to *GaadiPe* — the complete record of any vehicle registered in India, from the Government’s VAHAN and e-Challan records.\n\n'
      + '*Free check* — after you sign in\n• Make, model and variant\n• Fuel and vehicle type\n• How many things need attention — expired or expiring documents and pending challans\n\n'
      + '*Full report — ₹19* · PDF with a GST invoice\n• Insurance (insurer and policy), PUC and road tax — and fitness and permit for commercial vehicles — each with its valid-until date\n• Every pending challan, with offence, place and amount\n• Loan / hypothecation, blacklist and NOC status\n• Number of owners, registration date and RTO\n• Owner name, chassis and engine number — masked, as on Parivahan\n• Alerts before documents expire, for 28 days\n\n'
      + '*Start checking vehicles by signing in* with your mobile number — a one-time code by SMS. No password, no app.',
    termsByUse: ['By signing in, you agree to GaadiPe’s', 'Terms of use', 'Privacy policy', 'and', 'Refund policy'],
    signInToCheck: (r) => `🔐 Sign in with your mobile to check *${r}* — *basic details free* (make, model, variant, fuel, vehicle type), *full report ₹19*. I’ll check it straight after.`,
    plateNoted: (r) => `👍 Noted *${r}* — I’ll check it right after you sign in. Your *mobile number*, please.`,
    checking: (r) => `Checking *${r}* …`,
    placeholderPlate: 'Type a vehicle number…',
    placeholderMobile: 'Your 10-digit mobile number',
    placeholderCode: '6-digit code from SMS',
    termsH: '📜 Before you sign in',
    termsAgree: ['I have read and agree to the', 'Terms of use', 'Privacy policy', 'and the', 'Refund policy'],
    agreeFirst: 'Please tick *I agree* to the Terms of use, Privacy policy and Refund policy first, then send your mobile number again.',
    askMobile: 'Sure! Your *mobile number*, please — I’ll send a one-time code by SMS. No password, no app.',
    // Added to a "sign in to …" message, so it is one bubble, not two (2026-10-08).
    codeHint: 'Type your *mobile number* below 👇 — I’ll send a one-time code by SMS. No password, no app.',
    badMobile: 'That doesn’t look like a 10-digit mobile number. Please try again.',
    codeSent: (m) => `✓ Code sent by SMS to *${m}*. Type it here.\n\n_Used GaadiPe on WhatsApp before? Your chat and reports will be here right after you verify._`,
    badCode: 'Please type the 6-digit code from the SMS.',
    signedIn: '✅ You’re signed in.',
    welcomeBack: (n) => `🎉 Welcome back${n ? `, *${n}*` : ''}!`,
    welcomeNew: '👋 Welcome to GaadiPe! Send any vehicle number to begin.',
    askVehicle: '🔍 Type a vehicle number below to check it now — like *KA01AB1234*.',
    found: 'We found your GaadiPe history:',
    vehicles: (n) => `${n} vehicle${n === 1 ? '' : 's'} checked`,
    reports: (n) => `${n} full report${n === 1 ? '' : 's'}`,
    waDivider: 'Your WhatsApp chat with GaadiPe',
    nowHere: 'Now on gaadipe.in',
    loadEarlier: 'Load earlier messages',
    signInMore: 'Sign in free to see every validity date and how many challans, and to save your checks. Full report ₹19.',
    fullReport: (p) => `Full report ${p}`,
    another: 'Check another',
    signIn: 'Sign in',
    home: 'Home',
    myVehicles: 'My vehicles',
    myReports: 'My reports',
    profile: 'Profile',
    howWorks: 'What do I get?',
    howAnswer: 'The *free check* shows the vehicle’s make, model and fuel, and how many things need attention.\n\nThe *full report* (₹19, GST invoice) shows insurance, PUC, road tax, fitness and permit dates, every challan with place and amount, loan (hypothecation), blacklist status and number of owners — as a PDF you can download.',
    attention: (n) => (n ? `⚠️ *${n} thing${n === 1 ? '' : 's'} need attention*` : '✅ *Nothing needs attention*'),
    /* Honest about what signing in gives (user, 2026-10-08: "this fools the
       user — the details are ₹19"). Signing in is free and keeps the vehicle and
       allows more checks; the details are the paid report, said with its price. */
    identityOnly: (p) => '✅ *Vehicle found in the Government records.*\n\n*Sign in free* with your mobile to save it to your account and check more vehicles.\n\nThe *full report* — insurance, PUC, road tax and fitness validity, challans, loan, blacklist and number of owners — is *' + p + '*, with a PDF and GST invoice.',
    expired: 'Expired', dueSoon: 'Due soon', challans: 'Pending challans',
    locked: 'In the full report',
    youHave: '📄 You have the full report for this vehicle.',
    // The public record, free after sign-in (2026-10-10, free_view_detail 'public').
    pub: {
      owner: 'Owner', regOn: 'Registered', age: (y, m) => `${y} yr ${m} mo old`, norms: 'Norms', seats: 'Seats',
      weight: 'Weight', rcStatus: 'RC status', rto: 'RTO', dates: 'Validity',
      challans: (n) => (n ? `🚨 ${n} pending challan${n === 1 ? '' : 's'} — offences and amounts in the full report` : '✅ No pending challans'),
      locked: 'In the ₹19 full report', verdictH: 'Verdict — before you pay',
    },
    open: 'Open report',
    trust: '🔒 Official Government records · Secure payments · Data protected',
    online: 'online',
    leftToday: (n) => `${n} free check${n === 1 ? '' : 's'} left today without signing in.`,
    invoices: 'Invoices',
    noVehicles: 'No vehicles yet. Send any vehicle number to check it.',
    noReports: 'No reports yet. Check a vehicle and get its full report for ₹19.',
    noInvoices: 'No invoices yet.',
    yourVehicles: (n) => `🚗 Your vehicles (${n})`,
    yourReports: (n) => `📄 Your reports (${n})`,
    yourInvoices: (n) => `🧾 Your invoices (${n})`,
    reportValid: (d) => `valid till ${d}`,
    reportExpired: 'download window ended',
    download: 'Download PDF',
    paidThanks: (r) => `✅ Payment received — thank you! Here is the full report for *${r}*.`,
    documents: 'Documents', challansH: 'Challans', ownership: 'Ownership & loan', fastag: 'FASTag',
    owners: (n) => `Owner no. ${n}`, loan: 'Loan', noLoan: 'No loan on record', blacklist: 'Blacklist',
    pendingAmt: (n, a) => `${n} pending · ${a}`, noChallans: 'No pending challans',
    daysLeft: (d) => (d < 0 ? `expired ${-d} days ago` : d === 0 ? 'expires today' : `${d} days left`),
    profileH: '👤 Your profile', mobileL: 'Mobile', nameL: 'Name', emailL: 'Email',
    offers: 'Tips & offers by SMS / email', signOut: 'Sign out', signedOut: 'You are signed out. Send any vehicle number for a free check.',
    vehicleBtn: 'Open',
    tapPlate: 'Tap a number to see its vehicle summary.',
    rm: { q: (r) => `Remove ${r} from My vehicles?`, body: 'It will no longer appear in your list. You can check it again any time — it comes back as a new entry.',
      report: 'Your report and invoice stay in My reports and Invoices.', alerts: 'Alerts for this vehicle will stop.',
      yes: '🗑 Remove', no: 'Cancel', done: (r) => `🗑 ${r} removed from My vehicles.`, label: (r) => `Remove ${r}`, empty: 'No vehicles left in your list. Send any vehicle number to check it.' },
    // Never "Registration Certificate" (user, 2026-10-08): this is GaadiPe's summary, not an RC.
    rc: { title: 'Vehicle Summary', sub: 'By GaadiPe from VAHAN records · not an RC or official document', flip: '↔ Swipe or tap Flip for more',
      flipBtn: 'Flip', back: 'My vehicles', prev: 'Previous', next: 'Next', report: 'Report', invoice: 'Invoice',
      loading: 'Opening the card…', noRecord: 'No saved record yet.', recheck: 'Check it again',
      owner: 'Owner', ownerNo: 'Owner no.', chassis: 'Chassis', engine: 'Engine', regDate: 'Registered on', rto: 'RTO',
      colour: 'Colour', mfg: 'Manufactured', cc: 'Engine cc', seats: 'Seats', norms: 'Emission norms', status: 'RC status',
      checks: (n) => `Checked ${n} time${n === 1 ? '' : 's'}`, docs: 'Documents', challans: 'Challans', loan: 'Loan', fastag: 'FASTag',
      lockedH: 'Dates, challans, loan & owners', lockedP: 'are in the full report — with a PDF and GST invoice.',
      unlock: (p) => `🔓 Full report ${p}`, fresh: (d) => `Saved record · ${d}`, attention: (n) => (n ? `⚠️ ${n} need attention` : '✅ Nothing flagged in the free check') },
    menuHint: 'Your vehicles, reports, invoices, profile and settings are all here.', gotIt: 'Got it',
    menu: 'Menu', mEmail: 'Email for reports', mNotify: 'Notifications', mLang: 'हिंदी में देखें', mHelp: 'Help & support',
    mTerms: 'Terms & privacy', mDeactivate: 'Deactivate my account', mHistory: 'Vehicle history',
    emailH: '✉️ Email for your reports and invoices', emailPh: 'you@example.com', save: 'Save',
    emailSent: (e) => `✓ Saved. A confirmation link was sent to *${e}* — tap it to get your reports and invoices there.`,
    emailSaved: '✓ Saved.', emailBad: 'That email address does not look right.',
    deactH: '⛔ Deactivate my account',
    deactBody: 'Monitoring, alerts and messages stop, notifications are switched off and you are signed out. Your tax invoices are kept, as the law requires.',
    deactReason: 'Why are you leaving? (optional)', deactBtn: 'Deactivate', cancel: 'Cancel', cancelled: 'OK — nothing changed.',
    notifyAsk: '🔔 Get alerts here about your vehicles — a new challan, insurance or PUC about to expire, your report ready? Tap *Allow*, then allow it in your browser.',
    allow: 'Allow notifications', notNow: 'Not now', notifyOn: '✅ Notifications are on for this phone. Tapping one opens this chat.',
    notifyBlocked: 'Notifications are blocked for gaadipe.in in your browser settings. Allow them there to get alerts.',
    notifyUnsupported: 'This browser cannot show notifications here. On iPhone, add GaadiPe to your Home Screen (Share → Add to Home Screen) and open it from there.',
    notifyOffNow: 'Notifications are off for this phone.', turnOff: 'Turn off', notifyIsOn: '🔔 Notifications are on for this phone.',
    helpH: '❓ Help & support',
    helpBody: 'Write to *support@gaadipe.in* — we reply within a day. Tell us your mobile number and the vehicle number, if it is about one.',
    // Name and email (2026-10-07): highly recommended while WhatsApp is disabled.
    emailNudge: '📧 *Highly recommended: add your name and email.*\n\nOur WhatsApp number is currently disabled by Meta due to technical concerns, so we cannot reach you there for now.\n\nWith a confirmed email you get *alerts about your vehicles* — a new challan, insurance or PUC about to expire — and your reports and invoices.',
    addEmail: 'Add my name & email', later: 'Later',
    askName: 'Great! First, your *name* — how should we address you?',
    askEmail: (n) => `Thanks${n ? `, *${n}*` : ''}! Now your *email address* — I’ll send a link to confirm it is yours.`,
    badName: 'Please write your name — at least two letters, no numbers.',
    emailConfirm: (e) => `✓ Saved. A confirmation link is on its way to *${e}*.\n\nOpen your inbox (check *Spam* too) and tap *Confirm* — vehicle alerts start by email once it is confirmed.`,
    emailSame: (e) => `*${e}* is already saved.`,
    didYouMean: (s) => `Use ${s}`,
    placeholderName: 'Your name', placeholderEmail: 'you@gmail.com',
    emailOk: '✅ Confirmed — alerts come here', emailWait: '⏳ Waiting for you to confirm', emailNone: 'Not added — alerts cannot reach you',
    resend: 'Send the link again', resent: '✓ A new confirmation link was sent. Check your inbox and Spam.',
    edit: 'Edit', saved: '✓ Saved.', laterOk: 'OK. You can add it any time from the menu ⋮ → Profile.',
    update: 'Update', changeNumber: 'Change number', changeWarnH: 'Changing your mobile number',
    changeWarn: 'You will be signed in on the new number as a fresh account. Your vehicles, reports and alerts stay with this number — they do not move by themselves.',
    transferAsk: 'Ask GaadiPe to move my vehicles, reports and alerts to the new number',
    transferNote: 'Anything support should know (optional)', sendCode: 'Send code to the new number', verifySwitch: 'Verify and switch',
    transferHelp: 'Support checks every transfer and emails you the answer. Questions: support@gaadipe.in.',
    switched: (m) => `You are now signed in on *${m}*.`, transferSent: 'Your transfer request is with support — you will get an email when it is approved.',
    emailVerifiedNow: '✅ Your email is confirmed. Alerts, reports and invoices will come there.',
    emailCodeSent: (e) => `📧 A 6-digit code is on its way to *${e}*.\n\nType it here to confirm your email (check *Spam* too). It works for 10 minutes.`,
    badEmailCode: 'Please type the 6-digit code from the email.',
    signOutH: '↪ Sign out?', signOutBody: 'You will need your mobile number and an SMS code to sign in again on this phone. Notifications to this phone stop.',
    signOutYes: 'Sign out', deactReasons: ['I don’t need GaadiPe any more', 'I sold my vehicle', 'Too expensive', 'I got wrong or old information', 'Privacy concerns', 'Other'],
    deactWhy: 'Why are you leaving?', deactOther: 'Tell us a little more', deactFresh: 'If you sign in again later, it will be a completely new, empty account — your old vehicles and reports will not come back.',
  },
  hi: {
    hello: 'नमस्ते! 🙏 *GaadiPe* में आपका स्वागत है — भारत में रजिस्टर्ड किसी भी गाड़ी का पूरा रिकॉर्ड।\n\nइंश्योरेंस, PUC, रोड टैक्स और फिटनेस की वैधता, बाकी चालान, लोन (हाइपोथिकेशन), ब्लैकलिस्ट स्थिति और कितने मालिक — सरकारी VAHAN और e-Challan रिकॉर्ड से, PDF रिपोर्ट के साथ।\n\n*शुरू करने के लिए गाड़ी नंबर लिखें* — जैसे *KA01AB1234*। पहली जाँच मुफ़्त है, साइन इन की ज़रूरत नहीं।',
    helloShort: 'नमस्ते! 🙏 *GaadiPe* किसी भी भारतीय गाड़ी का इंश्योरेंस, PUC, चालान, लोन और मालिक दिखाता है — सरकारी रिकॉर्ड से।\n'
      + 'साइन इन के बाद मुफ़्त जाँच · पूरी रिपोर्ट *₹19* में, PDF के साथ।\n'
      + '*शुरू करने के लिए मोबाइल से साइन इन करें* 👇',
    helloFree: 'नमस्ते! 🙏 मैं *GaadiPe* हूँ — सरकारी डेटा से किसी भी भारतीय गाड़ी का रिकॉर्ड पढ़ता हूँ।\n'
      + '*नीचे कोई भी गाड़ी नंबर लिखें* 👇 — मैं उसकी कंपनी और मॉडल *मुफ़्त* बताऊँगा, बिना साइन इन (सटीक वेरिएंट साइन इन के बाद दिखेगा)।\n'
      + 'सब कुछ चाहिए — इंश्योरेंस, PUC, चालान, लोन, मालिक? पूरी रिपोर्ट *₹19*।',
    free: {
      ask: (r) => `बढ़िया — *${r}* देखते हैं 🔎\nउससे पहले एक छोटी सी बात:`,
      foundIntro: (r) => `यह रहा! ✨ सरकारी रिकॉर्ड में *${r}* के बारे में:`,
      nudge: '💡 यह गाड़ी ख़रीद रहे हैं? ₹19 की रिपोर्ट बताती है कि इस पर *लोन* है या नहीं, *बाकी चालान*, *इंश्योरेंस या PUC समाप्त* और *कितने मालिक* — विक्रेता को पैसे देने से पहले।',
      consentH: (r) => `${r} जाँचें`,
      consent: 'आगे बढ़ने पर आप GaadiPe के उपयोग की शर्तें, गोपनीयता नीति और रिफ़ंड नीति से सहमत होते हैं, और पुष्टि करते हैं कि आप यह गाड़ी किसी वैध उद्देश्य से जाँच रहे हैं (जैसे इसे ख़रीदना, या यह आपकी अपनी है)। इस जाँच के साथ आपके डिवाइस और नेटवर्क की जानकारी दर्ज की जाती है।',
      agree: '✅ सहमत हूँ, जाँचें',
      links: ['उपयोग की शर्तें', 'गोपनीयता नीति', 'रिफ़ंड नीति'],
      found: '✅ सरकारी रिकॉर्ड में मिली',
      hidden: 'मॉडल का वेरिएंट छिपा है — पूरा मॉडल और वेरिएंट देखने के लिए मुफ़्त साइन इन करें।',
      inReport: 'हर वैधता की तारीख — इंश्योरेंस, PUC, रोड टैक्स, फिटनेस — और कितने चालान, देखने के लिए *मुफ़्त साइन इन* करें। *पूरी रिपोर्ट ₹19:* लोन, ब्लैकलिस्ट व NOC, हर चालान राशि के साथ, कितने मालिक, साफ़ फ़ैसला, PDF + 28 दिन अलर्ट।',
      buy: (p) => `🔓 पूरी रिपोर्ट लें — ${p}`,
      more: 'यह आज की मुफ़्त जाँच थी। हर तारीख और चालानों की गिनती के लिए *मुफ़्त साइन इन* करें; लोन, चालान राशि और फ़ैसले के लिए *पूरी रिपोर्ट ₹19*।',
      usedToday: (r) => `🙏 माफ़ कीजिए, आज की *1 मुफ़्त जाँच* हो चुकी है।\n\n*${r}* और दूसरी गाड़ियाँ जाँचने के लिए कृपया *साइन इन* करें — *बेसिक जानकारी मुफ़्त* (कंपनी, मॉडल, वेरिएंट, ईंधन, गाड़ी का प्रकार), *पूरी रिपोर्ट ₹19*। साइन इन होते ही मैं *${r}* जाँच दूँगा।`,
      limit: '🔐 आज की मुफ़्त जाँच हो चुकी है। और जाँचने के लिए मोबाइल से साइन इन करें — *बेसिक जानकारी मुफ़्त* (कंपनी, मॉडल, वेरिएंट, ईंधन, गाड़ी का प्रकार), *पूरी रिपोर्ट ₹19*।',
      signIn: '🔐 और जाँचने के लिए साइन इन करें',
    },
    sample: { chip: '📄 नमूना रिपोर्ट देखें', more: '📋 पूरी जानकारी', intro: 'पूरी रिपोर्ट ऐसी दिखती है — एक *काल्पनिक गाड़ी* पर, कुछ भी असली नहीं 👇',
      badge: 'नमूना', ribbon: 'नमूना — काल्पनिक गाड़ी, असली डेटा नहीं', cta: '🔐 अपनी गाड़ी जाँचने के लिए साइन इन करें' },
    helloSignIn: 'नमस्ते! 🙏 *GaadiPe* में आपका स्वागत है — भारत में रजिस्टर्ड किसी भी गाड़ी का पूरा रिकॉर्ड, सरकारी VAHAN और e-Challan रिकॉर्ड से।\n\n'
      + '*मुफ़्त जाँच* — साइन इन के बाद\n• कंपनी, मॉडल और वेरिएंट\n• फ़्यूल और गाड़ी का प्रकार\n• कितनी चीज़ों पर ध्यान चाहिए — समाप्त या जल्द समाप्त होने वाले दस्तावेज़ और बाकी चालान\n\n'
      + '*पूरी रिपोर्ट — ₹19* · PDF, GST बिल के साथ\n• इंश्योरेंस (कंपनी और पॉलिसी), PUC और रोड टैक्स — और व्यावसायिक गाड़ियों के लिए फिटनेस और परमिट — हर एक की वैधता की तारीख़\n• हर बाकी चालान — अपराध, जगह और राशि के साथ\n• लोन / हाइपोथिकेशन, ब्लैकलिस्ट और NOC की स्थिति\n• कितने मालिक, रजिस्ट्रेशन की तारीख़ और RTO\n• मालिक का नाम, चेसिस और इंजन नंबर — छिपे हुए, जैसे परिवहन पर\n• दस्तावेज़ समाप्त होने से पहले अलर्ट, 28 दिनों तक\n\n'
      + '*गाड़ियाँ जाँचना शुरू करने के लिए साइन इन करें* — मोबाइल नंबर पर SMS से एक बार का कोड। कोई पासवर्ड नहीं, कोई ऐप नहीं।',
    termsByUse: ['साइन इन करके आप GaadiPe की', 'उपयोग की शर्तें', 'गोपनीयता नीति', 'और', 'रिफ़ंड नीति से सहमत होते हैं'],
    signInToCheck: (r) => `🔐 *${r}* जाँचने के लिए मोबाइल से साइन इन करें — *बेसिक जानकारी मुफ़्त* (कंपनी, मॉडल, वेरिएंट, ईंधन, गाड़ी का प्रकार), *पूरी रिपोर्ट ₹19*। साइन इन होते ही मैं इसे जाँच दूँगा।`,
    plateNoted: (r) => `👍 *${r}* नोट कर लिया — साइन इन होते ही इसकी जाँच करूँगा। कृपया अपना *मोबाइल नंबर* लिखें।`,
    checking: (r) => `*${r}* की जाँच हो रही है…`,
    placeholderPlate: 'गाड़ी नंबर लिखें…',
    placeholderMobile: 'अपना 10 अंकों का मोबाइल नंबर',
    placeholderCode: 'SMS का 6 अंकों का कोड',
    termsH: '📜 साइन इन से पहले',
    termsAgree: ['मैंने पढ़ लिया है और मैं सहमत हूँ —', 'उपयोग की शर्तें', 'गोपनीयता नीति', 'और', 'रिफ़ंड नीति'],
    agreeFirst: 'कृपया पहले उपयोग की शर्तें, गोपनीयता नीति और रिफ़ंड नीति पर *सहमत* का निशान लगाएँ, फिर अपना मोबाइल नंबर दोबारा भेजें।',
    askMobile: 'ज़रूर! अपना *मोबाइल नंबर* भेजें — मैं SMS से एक कोड भेजूँगा। कोई पासवर्ड नहीं, कोई ऐप नहीं।',
    codeHint: 'नीचे अपना *मोबाइल नंबर* लिखें 👇 — मैं SMS से एक कोड भेजूँगा। कोई पासवर्ड नहीं, कोई ऐप नहीं।',
    badMobile: 'यह 10 अंकों का मोबाइल नंबर नहीं लगता। फिर से कोशिश करें।',
    codeSent: (m) => `✓ *${m}* पर SMS से कोड भेजा गया। उसे यहाँ लिखें।\n\n_पहले WhatsApp पर GaadiPe इस्तेमाल किया है? वेरिफ़ाई करते ही आपकी चैट और रिपोर्ट यहाँ होंगी।_`,
    badCode: 'कृपया SMS का 6 अंकों का कोड लिखें।',
    signedIn: '✅ आप साइन इन हो गए हैं।',
    welcomeBack: (n) => `🎉 वापसी पर स्वागत है${n ? `, *${n}*` : ''}!`,
    welcomeNew: '👋 GaadiPe में स्वागत है! शुरू करने के लिए कोई भी गाड़ी नंबर भेजें।',
    askVehicle: '🔍 जाँच के लिए नीचे कोई भी गाड़ी नंबर लिखें — जैसे *KA01AB1234*।',
    found: 'आपका GaadiPe इतिहास:',
    vehicles: (n) => `${n} गाड़ियाँ जाँचीं`,
    reports: (n) => `${n} पूरी रिपोर्ट`,
    waDivider: 'GaadiPe के साथ आपकी WhatsApp चैट',
    nowHere: 'अब gaadipe.in पर',
    loadEarlier: 'पुराने संदेश देखें',
    signInMore: 'हर वैधता की तारीख और कितने चालान देखने और अपनी जाँच सेव करने के लिए मुफ़्त साइन इन करें। पूरी रिपोर्ट ₹19।',
    fullReport: (p) => `पूरी रिपोर्ट ${p}`,
    another: 'दूसरी गाड़ी',
    signIn: 'साइन इन',
    home: 'होम',
    myVehicles: 'मेरी गाड़ियाँ',
    myReports: 'मेरी रिपोर्ट',
    profile: 'प्रोफ़ाइल',
    howWorks: 'मुझे क्या मिलेगा?',
    howAnswer: '*मुफ़्त जाँच* में गाड़ी का मेक, मॉडल, ईंधन और कितनी चीज़ों पर ध्यान चाहिए, यह दिखता है।\n\n*पूरी रिपोर्ट* (₹19, GST बिल) में बीमा, PUC, रोड टैक्स, फ़िटनेस, परमिट की तारीखें, हर चालान (जगह और राशि), लोन, ब्लैकलिस्ट और मालिकों की संख्या — PDF में।',
    attention: (n) => (n ? `⚠️ *${n} चीज़ों पर ध्यान चाहिए*` : '✅ *कुछ भी बाकी नहीं*'),
    identityOnly: (p) => '✅ *गाड़ी सरकारी रिकॉर्ड में मिल गई।*\n\nइसे अपने खाते में सेव करने और और गाड़ियाँ जाँचने के लिए मोबाइल से *मुफ़्त साइन इन* करें।\n\n*पूरी रिपोर्ट* — इंश्योरेंस, PUC, रोड टैक्स और फिटनेस की वैधता, चालान, लोन, ब्लैकलिस्ट और कितने मालिक — *' + p + '* में, PDF और GST बिल के साथ।',
    expired: 'समाप्त', dueSoon: 'जल्द', challans: 'बाकी चालान',
    locked: 'पूरी रिपोर्ट में',
    youHave: '📄 इस गाड़ी की पूरी रिपोर्ट आपके पास है।',
    pub: {
      owner: 'मालिक', regOn: 'पंजीकरण', age: (y, m) => `${y} साल ${m} महीने पुरानी`, norms: 'मानक', seats: 'सीटें',
      weight: 'वज़न', rcStatus: 'RC स्थिति', rto: 'RTO', dates: 'वैधता',
      challans: (n) => (n ? `🚨 ${n} चालान बाकी — अपराध और राशि पूरी रिपोर्ट में` : '✅ कोई चालान बाकी नहीं'),
      locked: '₹19 की पूरी रिपोर्ट में', verdictH: 'फ़ैसला — पैसे देने से पहले',
    },
    open: 'रिपोर्ट खोलें',
    trust: '🔒 आधिकारिक सरकारी रिकॉर्ड · सुरक्षित भुगतान · डेटा सुरक्षित',
    online: 'ऑनलाइन',
    leftToday: (n) => `बिना साइन इन आज ${n} मुफ़्त जाँच बाकी।`,
    invoices: 'बिल',
    noVehicles: 'अभी कोई गाड़ी नहीं। जाँच के लिए कोई भी गाड़ी नंबर भेजें।',
    noReports: 'अभी कोई रिपोर्ट नहीं। गाड़ी जाँचें और ₹19 में पूरी रिपोर्ट लें।',
    noInvoices: 'अभी कोई बिल नहीं।',
    yourVehicles: (n) => `🚗 आपकी गाड़ियाँ (${n})`,
    yourReports: (n) => `📄 आपकी रिपोर्ट (${n})`,
    yourInvoices: (n) => `🧾 आपके बिल (${n})`,
    reportValid: (d) => `${d} तक मान्य`,
    reportExpired: 'डाउनलोड समय समाप्त',
    download: 'PDF डाउनलोड',
    paidThanks: (r) => `✅ भुगतान मिल गया — धन्यवाद! *${r}* की पूरी रिपोर्ट यह रही।`,
    documents: 'दस्तावेज़', challansH: 'चालान', ownership: 'मालिक और लोन', fastag: 'FASTag',
    owners: (n) => `मालिक क्रमांक ${n}`, loan: 'लोन', noLoan: 'कोई लोन दर्ज नहीं', blacklist: 'ब्लैकलिस्ट',
    pendingAmt: (n, a) => `${n} बाकी · ${a}`, noChallans: 'कोई चालान बाकी नहीं',
    daysLeft: (d) => (d < 0 ? `${-d} दिन पहले समाप्त` : d === 0 ? 'आज समाप्त' : `${d} दिन बाकी`),
    profileH: '👤 आपकी प्रोफ़ाइल', mobileL: 'मोबाइल', nameL: 'नाम', emailL: 'ईमेल',
    offers: 'SMS / ईमेल पर टिप्स और ऑफ़र', signOut: 'साइन आउट', signedOut: 'आप साइन आउट हो गए। मुफ़्त जाँच के लिए कोई भी गाड़ी नंबर भेजें।',
    vehicleBtn: 'खोलें',
    tapPlate: 'गाड़ी का सारांश देखने के लिए नंबर पर टैप करें।',
    rm: { q: (r) => `${r} को मेरी गाड़ियों से हटाएँ?`, body: 'यह आपकी सूची में नहीं दिखेगी। आप इसे कभी भी फिर से जाँच सकते हैं — यह नई एंट्री की तरह वापस आएगी।',
      report: 'आपकी रिपोर्ट और बिल "मेरी रिपोर्ट" और "बिल" में बने रहेंगे।', alerts: 'इस गाड़ी के अलर्ट बंद हो जाएँगे।',
      yes: '🗑 हटाएँ', no: 'रद्द करें', done: (r) => `🗑 ${r} मेरी गाड़ियों से हटा दी गई।`, label: (r) => `${r} हटाएँ`, empty: 'आपकी सूची में कोई गाड़ी नहीं बची। जाँच के लिए कोई भी गाड़ी नंबर भेजें।' },
    rc: { title: 'गाड़ी का सारांश', sub: 'GaadiPe द्वारा VAHAN रिकॉर्ड से · यह RC या सरकारी दस्तावेज़ नहीं है', flip: '↔ और देखने के लिए स्वाइप करें या पलटें',
      flipBtn: 'पलटें', back: 'मेरी गाड़ियाँ', prev: 'पिछली', next: 'अगली', report: 'रिपोर्ट', invoice: 'बिल',
      loading: 'कार्ड खुल रहा है…', noRecord: 'अभी कोई सहेजा रिकॉर्ड नहीं।', recheck: 'फिर से जाँचें',
      owner: 'मालिक', ownerNo: 'मालिक क्रमांक', chassis: 'चेसिस', engine: 'इंजन', regDate: 'पंजीकरण तिथि', rto: 'RTO',
      colour: 'रंग', mfg: 'निर्माण', cc: 'इंजन cc', seats: 'सीटें', norms: 'उत्सर्जन मानक', status: 'RC स्थिति',
      checks: (n) => `${n} बार जाँची गई`, docs: 'दस्तावेज़', challans: 'चालान', loan: 'लोन', fastag: 'FASTag',
      lockedH: 'तारीखें, चालान, लोन और मालिक', lockedP: 'पूरी रिपोर्ट में हैं — PDF और GST बिल के साथ।',
      unlock: (p) => `🔓 पूरी रिपोर्ट ${p}`, fresh: (d) => `सहेजा रिकॉर्ड · ${d}`, attention: (n) => (n ? `⚠️ ${n} चीज़ों पर ध्यान चाहिए` : '✅ मुफ़्त जाँच में कुछ नहीं मिला') },
    menuHint: 'आपकी गाड़ियाँ, रिपोर्ट, बिल, प्रोफ़ाइल और सेटिंग्स — सब यहाँ हैं।', gotIt: 'ठीक है',
    menu: 'मेनू', mEmail: 'रिपोर्ट के लिए ईमेल', mNotify: 'नोटिफ़िकेशन', mLang: 'View in English', mHelp: 'मदद और सहायता',
    mTerms: 'नियम और गोपनीयता', mDeactivate: 'मेरा खाता बंद करें', mHistory: 'गाड़ियों का इतिहास',
    emailH: '✉️ आपकी रिपोर्ट और बिल के लिए ईमेल', emailPh: 'you@example.com', save: 'सहेजें',
    emailSent: (e) => `✓ सहेजा गया। *${e}* पर पुष्टि लिंक भेजा गया — रिपोर्ट और बिल वहाँ पाने के लिए उसे टैप करें।`,
    emailSaved: '✓ सहेजा गया।', emailBad: 'यह ईमेल पता सही नहीं लगता।',
    deactH: '⛔ मेरा खाता बंद करें',
    deactBody: 'निगरानी, अलर्ट और संदेश रुक जाएँगे, नोटिफ़िकेशन बंद होंगे और आप साइन आउट हो जाएँगे। कानून के अनुसार आपके टैक्स बिल रखे जाएँगे।',
    deactReason: 'आप क्यों जा रहे हैं? (वैकल्पिक)', deactBtn: 'खाता बंद करें', cancel: 'रद्द करें', cancelled: 'ठीक है — कुछ नहीं बदला।',
    notifyAsk: '🔔 अपनी गाड़ियों के अलर्ट यहीं पाएँ — नया चालान, बीमा या PUC समाप्त होने वाला, रिपोर्ट तैयार? *अनुमति दें* दबाएँ, फिर ब्राउज़र में अनुमति दें।',
    allow: 'नोटिफ़िकेशन की अनुमति दें', notNow: 'अभी नहीं', notifyOn: '✅ इस फ़ोन पर नोटिफ़िकेशन चालू हैं। टैप करने पर यही चैट खुलेगी।',
    notifyBlocked: 'ब्राउज़र सेटिंग में gaadipe.in के नोटिफ़िकेशन बंद हैं। अलर्ट पाने के लिए वहाँ अनुमति दें।',
    notifyUnsupported: 'यह ब्राउज़र यहाँ नोटिफ़िकेशन नहीं दिखा सकता। iPhone पर GaadiPe को होम स्क्रीन पर जोड़ें (Share → Add to Home Screen) और वहीं से खोलें।',
    notifyOffNow: 'इस फ़ोन पर नोटिफ़िकेशन बंद हैं।', turnOff: 'बंद करें', notifyIsOn: '🔔 इस फ़ोन पर नोटिफ़िकेशन चालू हैं।',
    helpH: '❓ मदद और सहायता',
    helpBody: '*support@gaadipe.in* पर लिखें — हम एक दिन में जवाब देते हैं। अपना मोबाइल नंबर और (अगर हो) गाड़ी नंबर ज़रूर लिखें।',
    emailNudge: '📧 *ज़रूर करें: अपना नाम और ईमेल जोड़ें।*\n\nहमारा WhatsApp नंबर अभी Meta ने तकनीकी कारणों से बंद किया हुआ है, इसलिए फ़िलहाल हम आप तक वहाँ नहीं पहुँच सकते।\n\nकन्फ़र्म ईमेल से आपको *अपनी गाड़ियों के अलर्ट* मिलेंगे — नया चालान, बीमा या PUC खत्म होने वाला हो — और आपकी रिपोर्ट व इनवॉइस भी।',
    addEmail: 'नाम और ईमेल जोड़ें', later: 'बाद में',
    askName: 'बढ़िया! पहले अपना *नाम* लिखें — हम आपको किस नाम से बुलाएँ?',
    askEmail: (n) => `धन्यवाद${n ? `, *${n}*` : ''}! अब अपना *ईमेल पता* लिखें — मैं उसे कन्फ़र्म करने का लिंक भेजूँगा।`,
    badName: 'कृपया अपना नाम लिखें — कम से कम दो अक्षर, कोई अंक नहीं।',
    emailConfirm: (e) => `✓ सेव हो गया। *${e}* पर कन्फ़र्म करने का लिंक भेजा जा रहा है।\n\nअपना इनबॉक्स खोलें (*Spam* भी देखें) और *Confirm* दबाएँ — कन्फ़र्म होते ही गाड़ियों के अलर्ट ईमेल पर आने लगेंगे।`,
    emailSame: (e) => `*${e}* पहले से सेव है।`,
    didYouMean: (s) => `${s} रखें`,
    placeholderName: 'आपका नाम', placeholderEmail: 'you@gmail.com',
    emailOk: '✅ कन्फ़र्म — अलर्ट यहीं आएँगे', emailWait: '⏳ आपके कन्फ़र्म करने का इंतज़ार', emailNone: 'नहीं जोड़ा — अलर्ट आप तक नहीं पहुँच सकते',
    resend: 'लिंक फिर भेजें', resent: '✓ नया लिंक भेजा गया। इनबॉक्स और Spam देखें।',
    edit: 'बदलें', saved: '✓ सेव हो गया।', laterOk: 'ठीक है। मेनू ⋮ → प्रोफ़ाइल से कभी भी जोड़ें।',
    update: 'अपडेट करें', changeNumber: 'नंबर बदलें', changeWarnH: 'मोबाइल नंबर बदलना',
    changeWarn: 'नए नंबर पर आप एक नए खाते से साइन इन होंगे। आपकी गाड़ियाँ, रिपोर्ट और अलर्ट इसी नंबर पर रहेंगे — वे अपने आप नहीं जाते।',
    transferAsk: 'GaadiPe से कहें कि मेरी गाड़ियाँ, रिपोर्ट और अलर्ट नए नंबर पर ले जाएँ',
    transferNote: 'सपोर्ट के लिए कुछ (वैकल्पिक)', sendCode: 'नए नंबर पर कोड भेजें', verifySwitch: 'पुष्टि करें और बदलें',
    transferHelp: 'सपोर्ट हर ट्रांसफ़र की जाँच करता है और आपको ईमेल पर जवाब देता है। सवाल: support@gaadipe.in',
    switched: (m) => `अब आप *${m}* पर साइन इन हैं।`, transferSent: 'आपका ट्रांसफ़र अनुरोध सपोर्ट के पास है — मंज़ूरी पर ईमेल आएगा।',
    emailVerifiedNow: '✅ आपके ईमेल की पुष्टि हो गई। अलर्ट, रिपोर्ट और इनवॉइस वहीं आएँगे।',
    emailCodeSent: (e) => `📧 *${e}* पर 6 अंकों का कोड भेजा जा रहा है।\n\nईमेल की पुष्टि के लिए उसे यहाँ लिखें (*Spam* भी देखें)। कोड 10 मिनट तक चलेगा।`,
    badEmailCode: 'कृपया ईमेल का 6 अंकों का कोड लिखें।',
    signOutH: '↪ साइन आउट करें?', signOutBody: 'इस फ़ोन पर दोबारा साइन इन के लिए मोबाइल नंबर और SMS कोड लगेगा। इस फ़ोन पर नोटिफ़िकेशन बंद हो जाएँगे।',
    signOutYes: 'साइन आउट', deactReasons: ['अब GaadiPe की ज़रूरत नहीं', 'मैंने गाड़ी बेच दी', 'बहुत महँगा', 'जानकारी गलत या पुरानी मिली', 'प्राइवेसी की चिंता', 'अन्य'],
    deactWhy: 'आप क्यों जा रहे हैं?', deactOther: 'थोड़ा और बताएँ', deactFresh: 'बाद में दोबारा साइन इन करने पर बिल्कुल नया, खाली खाता बनेगा — पुरानी गाड़ियाँ और रिपोर्ट वापस नहीं आएँगी।',
  },
};

/* The conversation is kept on the device PER SIGNED-IN ACCOUNT only
   (gp.chat.u.<user id>). A visitor who is not signed in always starts fresh
   with the welcome; nothing from an earlier sign-in is ever shown to them.
   gp.chat.v1 was the old shared key, removed on load. */
const STORE = 'gp.chat.u.';
const OLD_STORE = 'gp.chat.v1';
const loadFor = (userId) => {
  try { return JSON.parse(localStorage.getItem(`${STORE}${userId}`) || '[]').filter((x) => x.kind !== 'typing'); } catch { return []; }
};
const USED = 'gp.chat.used';
const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
/* A SIGN-IN IN PROGRESS survives a refresh (user, 2026-10-08: "on refresh it asks
   the vehicle number"): this tab remembers that the visitor was signing in — and,
   once the code was sent, to which mobile — for 10 minutes. Cleared on sign-in. */
const SIGNING = 'gp.signing';
const signingSaved = () => {
  try {
    const s = JSON.parse(sessionStorage.getItem(SIGNING) || 'null');
    return s && Date.now() - (s.at || 0) < 10 * 60 * 1000 ? s : null;
  } catch { return null; }
};
const saveSigning = (s) => { try { sessionStorage.setItem(SIGNING, JSON.stringify({ ...s, at: Date.now() })); } catch { /* private mode */ } };
const clearSigning = () => { try { sessionStorage.removeItem(SIGNING); } catch { /* private mode */ } };

// Today's free check before sign-in, used on this browser (India date). The server is the real limit.
const istDay = () => new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);
const freeUsedToday = () => { try { return localStorage.getItem('gp.free.day') === istDay(); } catch { return false; } };
const markFreeUsed = () => { try { localStorage.setItem('gp.free.day', istDay()); } catch { /* private mode */ } };
const rupee = (p) => (p == null ? '₹19' : `₹${Math.round(p / 100)}`);
const cleanPlate = (s) => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const looksLikePlate = (s) => /^[A-Z]{2}\d{1,2}[A-Z]{0,3}\d{3,4}$/.test(cleanPlate(s)) || /^\d{2}BH\d{4}[A-Z]{1,2}$/.test(cleanPlate(s));
const prettyMobile = (m) => { const d = String(m || '').replace(/\D/g, '').slice(-10); return d.length === 10 ? `${d.slice(0, 5)} ${d.slice(5)}` : d; };
// Vehicle numbers are shown together, no spaces (user, 2026-10-08): KA02EX1480.
const prettyPlate = (s) => cleanPlate(s);
const ten = (s) => String(s || '').replace(/\D/g, '').slice(-10);

/** *bold* inside a run of text (also inside _italic_). */
const bolds = (s) => String(s).split(/(\*[^*\n]+\*)/g).map((part, j) => (
  /^\*[^*]+\*$/.test(part) ? <b key={j} className="font-semibold">{part.slice(1, -1)}</b> : <span key={j}>{part}</span>));

/** WhatsApp-style *bold*, _italic_ and line breaks — as React nodes, never HTML. */
function Text({ text }) {
  const lines = String(text || '').split('\n');
  return lines.map((line, i) => (
    <span key={i}>
      {line.split(/(_[^_\n]+_)/g).map((part, j) => (
        /^_[^_]+_$/.test(part) ? <i key={j}>{bolds(part.slice(1, -1))}</i> : <span key={j}>{bolds(part)}</span>))}
      {i < lines.length - 1 && <br />}
    </span>
  ));
}

const time = (at) => {
  try { return new Date(at).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true }).replace(/\s+/g, ' ').toLowerCase(); }
  catch { return ''; }
};

export default function Chat() {
  const { me, ready, signIn, signOut, setMe } = useSession();
  const { lang, setLang } = useLang();
  const L = T[lang === 'hi' ? 'hi' : 'en'];
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  // Filled once the sign-in is known: the account's own conversation, or a fresh welcome.
  const [items, setItems] = useState([]);
  const [history, setHistory] = useState({ items: [], more: false, before: null, loaded: false });
  const [mode, setMode] = useState('plate');         // plate | mobile | code | name | email
  const [pendingName, setPendingName] = useState('');
  const [pendingEmail, setPendingEmail] = useState('');
  /* "Government services may be down" (user, 2026-10-07): from /notice, switched in
     Configuration (check_notice_mode). Said before the first check, and when one fails. */
  const [checkNotice, setCheckNotice] = useState(null);
  const noticeSaid = useRef(false);
  // Sign in for every check (2026-10-08; check_sign_in_required) — known before the first number is typed.
  const [signInRequired, setSignInRequired] = useState(true);   // the default on the server too
  /* The greeting waits for this answer (2026-10-08): whether the first check
     needs a sign-in decides which welcome is shown. 2.5 s at most. */
  const [noticeReady, setNoticeReady] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setNoticeReady(true), 2500);
    api.notice().then((n) => { setCheckNotice(n?.check || null); setSignInRequired(Boolean(n?.sign_in_required)); })
      .catch(() => {}).finally(() => { clearTimeout(t); setNoticeReady(true); });
    return () => clearTimeout(t);
  }, []);
  const noticeText = checkNotice ? (lang === 'hi' ? checkNotice.hi : checkNotice.en) : '';
  const [mobile, setMobile] = useState('');
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [pendingReg, setPendingReg] = useState(null);
  /* AGREED BY SIGNING IN (user, 2026-10-08: "no need to tick & go"). The line
     under the welcome says so; signing in is the agreement, recorded on the
     server at every sign-in as before (consent_accepted, method sign_in). */
  const termsOk = true;
  const [buying, setBuying] = useState(null);       // { reg, price } — the payment window over the chat
  const [rcAt, setRcAt] = useState(null);           // { rows, index } — the RC card over the chat
  const [menuOpen, setMenuOpen] = useState(false);
  /* WHERE THE MENU IS (user, 2026-10-08: "the 3 dots, users may not recognise").
     The button says "Menu" in words, and the first time someone is signed in a
     small note points at it, with a soft pulse, until they tap it or "Got it". */
  const [menuHint, setMenuHint] = useState(false);
  const HINT_KEY = 'gp.menuHint.seen';
  const hideMenuHint = () => { setMenuHint(false); try { localStorage.setItem(HINT_KEY, '1'); } catch { /* private mode */ } };
  useEffect(() => {
    if (!me) { setMenuHint(false); return undefined; }
    let seen = false;
    try { seen = localStorage.getItem(HINT_KEY) === '1'; } catch { /* private mode */ }
    if (seen) return undefined;
    const t = setTimeout(() => setMenuHint(true), 2500);
    return () => clearTimeout(t);
  }, [me]);
  const [notifyState, setNotifyState] = useState('unknown');
  useEffect(() => { notify.state().then(setNotifyState).catch(() => setNotifyState('unsupported')); }, [me]);
  const listRef = useRef(null);
  const inputRef = useRef(null);
  const greeted = useRef(false);

  /* Remember the conversation on this device (not the history — that is read
     fresh). Paid reports, the profile and document lists are NOT kept on the
     device — a shared phone must not show them to the next person; they are
     reopened from the account. */
  // Whose saved conversation is on screen — nothing is saved until it has been loaded,
  // or the empty screen of the first moment would overwrite it.
  const loadedFor = useRef(null);
  useEffect(() => {
    if (!me?.id || loadedFor.current !== me.id) return;   // a visitor's conversation is never kept
    const keep = items.filter((x) => x.kind !== 'typing').map((x) => {
      if (x.kind === 'vehicle' && x.paid) return { ...x, kind: 'text', from: 'bot', text: `📄 *${x.vehicle?.reg_no}* — full report`, chips: [`open:${x.vehicle?.reg_no}`], vehicle: undefined };
      if (['profile', 'reports', 'invoices', 'vehicles', 'email', 'deactivate', 'notify', 'help', 'welcome', 'terms'].includes(x.kind)) return null;
      return x;
    }).filter(Boolean);
    try { localStorage.setItem(`${STORE}${me.id}`, JSON.stringify(keep.slice(-60))); } catch { /* private mode */ }
  }, [items, me?.id]);
  useEffect(() => { try { localStorage.removeItem(OLD_STORE); } catch { /* private mode */ } }, []);

  /* Signed out — by the menu, by deactivating, or because the session ended:
     the screen goes straight back to a fresh welcome (with the reason, if one
     was given). Nothing of the account stays on screen. */
  const prevMe = useRef(null);
  const resetNote = useRef(null);
  const afterSignIn = useRef(null);          // { open, next } from an old account address
  useEffect(() => {
    if (prevMe.current && !me) {
      loadedFor.current = null;
      setHistory({ items: [], more: false, before: null, loaded: false });
      setMode(signInRequired ? 'mobile' : 'plate');
      const note = resetNote.current; resetNote.current = null;
      const hello = signInRequired ? 'helloShort' : 'helloFree';
      setItems([{ id: uid(), at: new Date().toISOString(), from: 'bot', kind: 'text', text: note ? `${note}\n\n${L[hello]}` : L[hello],
        chips: signInRequired ? ['sample', 'fullInfo'] : ['sample', 'fullInfo', 'signIn'] },
        { id: uid(), at: new Date().toISOString(), from: 'bot', kind: 'text', text: T[lang === 'hi' ? 'en' : 'hi'][hello] },
        // Signed out with sign-in required: straight back to the mobile number, policies first (2026-10-08).
        ...(signInRequired ? [{ id: uid(), at: new Date().toISOString(), from: 'bot', kind: 'terms' }] : [])]);
    } else if (prevMe.current && me && String(prevMe.current.id) !== String(me.id)) {
      // Another account on this phone (a new mobile number): its own conversation, nothing of the old one.
      loadedFor.current = me.id;
      setHistory({ items: [], more: false, before: null, loaded: false });
      setMode('plate');
      const note = resetNote.current; resetNote.current = null;
      setItems([...loadFor(me.id), ...(note ? [{ id: uid(), at: new Date().toISOString(), from: 'bot', kind: 'text', text: note }] : [])]);
      setTimeout(() => welcome({ justSignedIn: true }), 300);
    }
    prevMe.current = me;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me]);
  useEffect(() => { try { localStorage.setItem(USED, '1'); } catch { /* private mode */ } }, []);
  useEffect(() => { document.title = 'GaadiPe — Chat'; }, []);

  /* The web admin's live view (lib/track.js): the journey step follows the chat. */
  useEffect(() => {
    const step = { mobile: 'signing_in', code: 'code', name: 'name', email: 'email' }[mode];
    journey(step ? { step, section: null } : { step: 'welcome' });
  }, [mode]);
  useEffect(() => { if (buying) journey({ step: 'paying', section: `₹19 payment · ${buying.reg}` }); }, [buying]);
  // Signed in: the sign-in-in-progress note is done with.
  useEffect(() => { if (me) clearSigning(); }, [me]);
  useEffect(() => { scrollSource(listRef.current); return () => scrollSource(null); }, []);
  // An admin ended this visit (support or security): sign out, and say so.
  useEffect(() => onEnded(() => {
    resetNote.current = lang === 'hi' ? '↪ GaadiPe सपोर्ट ने यह सत्र समाप्त किया। फिर से साइन इन करें।' : '↪ This session was ended by GaadiPe support. Please sign in again.';
    signOut().catch(() => {});
  }), [lang, signOut]);

  const scrollDown = useCallback(() => {
    requestAnimationFrame(() => { const el = listRef.current; if (el) el.scrollTop = el.scrollHeight; });
  }, []);
  /* THE WELCOME IS READ FROM ITS FIRST LINE (2026-10-08): while the visitor has
     said nothing yet, the conversation stays at the top, so the long opening
     (what GaadiPe is, free check, the ₹19 report) is not scrolled past its title. */
  const onlyWelcome = items.length > 0 && items.every((x) => x.from !== 'me') && items.length <= 4;
  useEffect(() => {
    if (onlyWelcome) { requestAnimationFrame(() => { const el = listRef.current; if (el) el.scrollTop = 0; }); return; }
    scrollDown();
  }, [items.length, scrollDown]); // eslint-disable-line react-hooks/exhaustive-deps

  /* A card that grows after it is added (a list, a report, an image) would end up under the
     input bar (user, 2026-10-07: "my vehicles list is cropping at the end"): whenever the
     conversation grows, follow it down — if the reader was at the bottom already. */
  const innerRef = useRef(null);
  const welcomeOnlyRef = useRef(false);
  welcomeOnlyRef.current = onlyWelcome;
  useEffect(() => {
    const el = listRef.current; const inner = innerRef.current;
    if (!el || !inner || typeof ResizeObserver === 'undefined') return undefined;
    let lastH = inner.scrollHeight;
    const ro = new ResizeObserver(() => {
      const grew = inner.scrollHeight > lastH;
      const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < (inner.scrollHeight - lastH) + 160;
      lastH = inner.scrollHeight;
      if (welcomeOnlyRef.current) return;      // the welcome is read from the top
      if (grew && nearBottom) el.scrollTop = el.scrollHeight;
    });
    ro.observe(inner);
    return () => ro.disconnect();
  }, []);

  /*
   * PACED LIKE A PERSON TYPING (user, 2026-10-08: "the entire conversation a
   * beautiful, professional animation, like a human chatting"). Every message
   * goes through one queue, in order: the customer's own appear at once; each
   * of ours is preceded by the typing dots for as long as a short reply takes to
   * type (longer text, a little longer — never more than about a second and a
   * half), and time already spent waiting for the server counts towards it, so
   * a slow answer is never made slower. Reduced motion: no waiting at all.
   */
  const queue = useRef(Promise.resolve());
  const typingSince = useRef(0);
  const paceOf = (x) => {
    if (x.from !== 'bot' || x.kind === 'typing') return 0;
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return 0;
    if (x.pace != null) return x.pace;
    return x.kind === 'text' ? Math.min(1500, 420 + String(x.text || '').length * 8) : 700;
  };
  const showDots = () => setItems((cur) => (cur.some((x) => x.kind === 'typing') ? cur : [...cur, { id: 'typing', kind: 'typing', from: 'bot' }]));
  const push = useCallback((...list) => {
    queue.current = queue.current.then(async () => {
      for (const x of list) {
        const wait = paceOf(x);
        if (wait) {
          showDots();
          if (!typingSince.current) typingSince.current = Date.now();
          const left = wait - (Date.now() - typingSince.current);
          if (left > 0) await new Promise((r) => setTimeout(r, left));
        }
        typingSince.current = 0;
        const { pace, ...item } = x;
        setItems((cur) => [...cur.filter((y) => y.kind !== 'typing'), { id: uid(), at: new Date().toISOString(), ...item }]);
      }
    }).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // The dots while we fetch: in the same queue, so they follow the customer's message.
  const typing = useCallback(() => {
    queue.current = queue.current.then(() => { typingSince.current = Date.now(); showDots(); });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const bot = useCallback((text, extra = {}) => push({ from: 'bot', kind: 'text', text, ...extra }), [push]);

  /* First open: greet, once. Signed in: welcome back + their WhatsApp history. */
  useEffect(() => {
    if (!ready || !noticeReady || greeted.current) return;
    greeted.current = true;
    if (me) {
      setItems(loadFor(me.id)); loadedFor.current = me.id; welcome();
      // No confirmed email yet: the recommendation again, once a day.
      if (!me.email_verified && nudgeDue(me.id)) { setTimeout(emailNudge, 900); markNudged(me.id); }
    }
    // A number brought from the home page (?reg=) is checked at once, then dropped from the address.
    const reg = cleanPlate(params.get('reg'));
    if (!me && signInRequired) {
      // Sign in first (2026-10-08): the greeting asks for the mobile, with the
      // policies to agree to right below — unless a number came with the link,
      // whose check asks for the sign-in itself.
      // In both languages (user, 2026-10-08: "people prefer Hindi as well") —
      // the chosen one first, the other right after.
      // Short, in both languages; a sample report and the full text one tap away (2026-10-08).
      bot(L.helloShort, { pace: 650, chips: ['sample', 'fullInfo'] });
      bot(T[lang === 'hi' ? 'en' : 'hi'].helloShort, { pace: 700 });
      // (/login and ?signin=1 land here too: the same opening, asked once.)
      if (!(reg && looksLikePlate(reg))) startSignIn(null, { quiet: true });
    } else if (!me && (params.get('signin') || params.get('open') || params.get('next') || signingSaved())) {
      /* Came here TO SIGN IN (a Sign in button, ?signin=1; an old account
         address; or a refresh in the middle of signing in): the sign-in welcome
         and the mobile box — not the free-check pitch followed by "your mobile
         number, please" (user, 2026-10-08). After the code was sent, straight
         back to "type the code". */
      const saved = signingSaved();
      bot(L.helloShort, { pace: 650, chips: ['sample', 'fullInfo'] });
      bot(T[lang === 'hi' ? 'en' : 'hi'].helloShort, { pace: 700 });
      startSignIn(null, { quiet: true });
      if (saved?.stage === 'code' && /^[6-9]\d{9}$/.test(saved.mobile || '')) {
        setMobile(saved.mobile); setMode('code');
        bot(L.codeSent(`${saved.mobile.slice(0, 5)} ${saved.mobile.slice(5)}`), { pace: 500 });
      }
    } else if (!me) {
      // The free check is on (check_sign_in_required false, migration 142): type a number, see make & model.
      bot(L.helloFree, { pace: 650, chips: ['sample', 'fullInfo', 'signIn'] });
      bot(T[lang === 'hi' ? 'en' : 'hi'].helloFree, { pace: 700 });
    }
    /* LOCAL DEVELOPMENT ONLY (?demo=full): the full-report card with sample data,
       to try its buttons without a live lookup. Never in a production build. */
    // ?demo=basic — a free-check card, to try "Full report ₹19" while the records server is down.
    if (import.meta.env.DEV && params.get('demo') === 'basic') {
      push({ from: 'bot', kind: 'vehicle', paid: false, signedIn: Boolean(me), price: 1900, vehicle: {
        reg_no: 'KA31N8147', pretty: 'KA 31 N 8147', identity: { maker: 'KIA INDIA', model: 'SELTOS D1.5 6AT HTX PLUS', fuel: 'Diesel', vehicle_class: 'Motor Car' },
        found: { needs_attention: 2, documents_total: 5, has_record: true },
        locked: ['Loan / hypothecation status', 'Blacklist and NOC status', 'Every challan, with its offence, place and amount'] } });
    }
    if (import.meta.env.DEV && params.get('demo') === 'full') {
      api.reports().then((r) => {
        const rep = (r.rows || []).find((x) => x.downloadable) || null;
        push({ from: 'bot', kind: 'vehicle', paid: true, report: rep, vehicle: DEMO_FULL });
      }).catch(() => {});
    }
    // Every "Sign in" on the site lands here (?signin=1) and asks for the mobile number at once.
    // An old account address (App.jsx ToChat): ?open=reports|invoices|profile|vehicles, ?next=/app/refer.
    const open = params.get('open');
    const next = params.get('next');
    if (next && /^\/app\/refer/.test(next)) afterSignIn.current = { next };
    if (open && ['reports', 'invoices', 'profile', 'vehicles'].includes(open)) {
      if (me) setTimeout(() => (open === 'profile' ? showProfile() : showList(open)), 500);
      else afterSignIn.current = { ...(afterSignIn.current || {}), open };
    }
    if (params.get('signin') || open || next) {
      const rest = new URLSearchParams(params); ['signin', 'open', 'next'].forEach((k) => rest.delete(k)); setParams(rest, { replace: true });
      // The greeting above has already asked for the mobile (both modes).
    }
    // Back from paying (?paid=REG): the report opens right here in the chat.
    const paid = cleanPlate(params.get('paid'));
    if ((reg && looksLikePlate(reg)) || paid) {
      const rest = new URLSearchParams(params); rest.delete('reg'); rest.delete('paid'); setParams(rest, { replace: true });
      if (paid && me) setTimeout(() => { journey({ step: 'paid', section: `full report · ${paid}` }); bot(L.paidThanks(prettyPlate(paid))); openVehicle(paid, { afterPayment: true }); }, 600);
      else if (reg) setTimeout(() => check(reg), 300);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, me, noticeReady]);

  async function welcome({ justSignedIn = false } = {}) {
    try {
      const [s, h] = await Promise.all([api.chatSummary(), api.chatHistory()]);
      setHistory({ items: h.items || [], more: h.more, before: h.before, loaded: true });
      const any = s.vehicles || s.reports || s.whatsapp;
      const lines = any
        ? [L.welcomeBack(s.name ? String(s.name).split(/\s+/)[0] : ''), '', L.found,
          s.vehicles ? `• ${L.vehicles(s.vehicles)}` : null,
          s.reports ? `• ${L.reports(s.reports)}` : null,
          // Once signed in, ask for the next number (2026-10-08).
          '', L.askVehicle].filter((x) => x !== null).join('\n')
        : L.welcomeNew;
      if (justSignedIn || !items.some((x) => x.kind === 'welcome')) {
        push({ from: 'bot', kind: 'welcome', text: lines, last: s.last_vehicle, chips: ['another', 'myVehicles', 'myReports', 'howWorks'] });
      }
    } catch { /* the chat still works without it */ }
  }

  async function loadEarlier() {
    if (!history.before) return;
    const el = listRef.current; const h0 = el?.scrollHeight || 0;
    const h = await api.chatHistory(history.before).catch(() => null);
    if (!h) return;
    setHistory((cur) => ({ items: [...(h.items || []), ...cur.items], more: h.more, before: h.before, loaded: true }));
    requestAnimationFrame(() => { if (el) el.scrollTop = el.scrollHeight - h0; });
  }

  /* ────────────────────────────── what the customer sends ── */

  async function send(raw) {
    const text = String(raw ?? input).trim();
    if (!text || busy) return;
    setInput('');
    // A vehicle number typed while we ask for the mobile: keep it, check it after sign-in.
    if (mode === 'mobile' && !/^[\d\s+-]+$/.test(text) && looksLikePlate(text)) {
      const reg = cleanPlate(text);
      push({ from: 'me', kind: 'plate', text: prettyPlate(reg) });
      interaction('search', `Searched ${reg} — asked to sign in first`, { reg_no: reg });
      setPendingReg(reg); bot(L.plateNoted(prettyPlate(reg)));   // the policy card is already on screen
      return;
    }
    if (mode === 'mobile') return sendMobile(text);
    if (mode === 'code') return sendCode(text);
    if (mode === 'name') return sendName(text);
    if (mode === 'email') return sendEmail(text);
    if (mode === 'ecode') return sendEmailCode(text);
    if (looksLikePlate(text)) return check(text);
    // A mobile number typed in the vehicle box: they want to sign in.
    if (!me && /^[6-9]\d{9}$/.test(ten(text)) && String(text).replace(/\D/g, '').length >= 10) return sendMobile(text);
    push({ from: 'me', kind: 'text', text });
    bot(lang === 'hi'
      ? 'मैं गाड़ी नंबर समझता हूँ — जैसे *KA01AB1234*। या नीचे से कोई विकल्प चुनें।'
      : 'I understand vehicle numbers — like *KA01AB1234*. Or pick an option below.', { chips: me ? ['howWorks'] : ['signIn'] });
  }

  async function check(raw, { signedIn = false } = {}) {
    const reg = cleanPlate(raw);
    // Shown as a number plate, not a plain bubble (2026-10-07).
    push({ from: 'me', kind: 'plate', text: prettyPlate(reg) });
    // Sign in first (2026-10-08): the number is kept and checked straight after signing in.
    if (!me && !signedIn && signInRequired) {
      interaction('search', `Searched ${reg} — asked to sign in first`, { reg_no: reg });
      askToSignIn(L.signInToCheck(prettyPlate(reg)), reg);
      return;
    }
    /* THE FREE CHECK BEFORE SIGN-IN (2026-10-08): nothing is looked up until the
       visitor taps "Agree & check" on the card that names the number. */
    if (!me && !signedIn && freeUsedToday()) {
      // Today's free check is used on this browser: straight to the sign-in (the server enforces it too).
      interaction('search', `Searched ${reg} — free check already used today, asked to sign in`, { reg_no: reg });
      askToSignIn(L.free.usedToday(prettyPlate(reg)), reg);
      return;
    }
    if (!me && !signedIn) {
      interaction('search', `Typed ${reg} — asked to agree before the free check`, { reg_no: reg });
      journey({ step: 'consent', section: `free check · ${reg}` });
      bot(L.free.ask(prettyPlate(reg)));
      push({ from: 'bot', kind: 'consent', reg });
      return;
    }
    // Said before the first check; after that, only alongside a failure (never twice in a row).
    const again = noticeText && noticeSaid.current ? `\n\n${noticeText}` : '';
    if (noticeText && !noticeSaid.current) { noticeSaid.current = true; bot(`⚠️ ${noticeText}`); }
    setBusy(true); typing();
    journey({ step: 'checking' });
    interaction('search', `Searched ${reg}`, { reg_no: reg });
    try {
      const out = await api.check(reg);
      if (out.error === 'sign_in_needed') { interaction('error', 'Free checks used up — asked to sign in'); askToSignIn(out.message, reg); return; }
      if (out.error || !out.vehicle) {
        interaction('error', `Check of ${reg} failed: ${String(out.message || out.error || '').slice(0, 60)}`, { reg_no: reg });
        bot(`⚠️ ${out.message || 'Something went wrong. Please try again.'}${again}`, { chips: ['another'] }); return;
      }
      const paidCard = Boolean(out.report || out.vehicle.paid);
      journey({ step: 'viewing', section: paidCard ? `full report · ${reg}` : `vehicle card · ${reg}` });
      // The funnel's "search completed" (web admin, phase 4).
      interaction('view', `Saw ${paidCard ? 'the full report of' : 'the details of'} ${reg}`, { reg_no: reg });
      push({ from: 'bot', kind: 'vehicle', vehicle: out.vehicle, paid: paidCard, report: out.report || null,
             price: out.price_paise, signedIn: Boolean(me), left: out.left_today });
    } catch (e) {
      interaction('error', `Check of ${reg} failed: ${String(e.message).slice(0, 60)}`, { reg_no: reg });
      bot(`⚠️ ${e.message}${again}`, { chips: ['another'] });
    } finally { setBusy(false); }
  }

  /* "Agree & check" tapped: the one free look — make, model name and fuel — with
     the exact words the visitor agreed to sent along and recorded (migration 142). */
  async function freeCheck(reg, itemId) {
    setItems((cur) => cur.map((x) => (x.id === itemId ? { ...x, agreed: true } : x)));
    interaction('click', `Agreed & checked ${reg} (free check)`, { reg_no: reg });
    setBusy(true); typing();
    journey({ step: 'checking', section: `free check · ${reg}` });
    try {
      const out = await api.chatCheck(reg, { agreed: true, words: `${L.free.consentH(prettyPlate(reg))}. ${L.free.consent}`, language: lang === 'hi' ? 'hi' : 'en' });
      if (out.error === 'sign_in_needed') {
        markFreeUsed();
        interaction('error', 'Free check used up — asked to sign in', { reg_no: reg });
        askToSignIn(L.free.usedToday(prettyPlate(reg)), reg); return;
      }
      if (out.error || !out.vehicle) {
        interaction('error', `Free check of ${reg} failed: ${String(out.message || out.error || '').slice(0, 60)}`, { reg_no: reg });
        bot(`⚠️ ${out.message || 'Something went wrong. Please try again.'}`, { chips: ['signIn'] }); return;
      }
      markFreeUsed();
      journey({ step: 'viewing', section: `free check result · ${reg}` });
      interaction('view', `Saw the free check of ${reg}`, { reg_no: reg });
      bot(L.free.foundIntro(prettyPlate(reg)), { pace: 500 });
      push({ from: 'bot', kind: 'freeVehicle', vehicle: out.vehicle, price: out.price_paise });
      bot(L.free.nudge, { pace: 1300 });
    } catch (e) {
      bot(`⚠️ ${e.message}`, { chips: ['signIn'] });
    } finally { setBusy(false); }
  }

  /* "Sign in to …" and "type your mobile number" in ONE message (user, 2026-10-08:
     the separate "Sure! Your mobile number, please" right after it repeated it). */
  function askToSignIn(text, reg) {
    bot(`${text}\n\n${L.codeHint}`);
    setPendingReg(reg);
    startSignIn(null, { quiet: true });
  }

  function startSignIn(reg = null, { quiet = false } = {}) {
    if (reg) setPendingReg(reg);
    setMode('mobile');
    if (!signingSaved()) saveSigning({ stage: 'mobile' });
    if (!quiet) bot(L.askMobile);   // quiet: the greeting already asked for it
    // "By signing in, you agree to…" — one small line, shown once (no tick, 2026-10-08).
    // In the message queue, so it sits under the greeting rather than above it.
    queue.current = queue.current.then(() => setItems((cur) => (cur.some((x) => x.kind === 'terms') ? cur
      : [...cur.filter((x) => x.kind !== 'typing'), { id: uid(), at: new Date().toISOString(), from: 'bot', kind: 'terms' }])));
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  async function sendMobile(text) {
    const m = ten(text);
    push({ from: 'me', kind: 'text', text: m.length === 10 ? `${m.slice(0, 5)} ${m.slice(5)}` : text });
    if (!/^[6-9]\d{9}$/.test(m)) { interaction('error', 'Mobile number did not look right'); bot(L.badMobile); return; }
    setBusy(true); typing();
    try {
      const out = await api.requestCode(m);
      if (!out.ok) { bot(`⚠️ ${out.message}`); return; }
      setMobile(m); setMode('code');
      saveSigning({ stage: 'code', mobile: m });
      bot(L.codeSent(`${m.slice(0, 5)} ${m.slice(5)}`));
    } catch (e) { bot(`⚠️ ${e.message}`); } finally { setBusy(false); }
  }

  async function sendCode(text) {
    const code = String(text).replace(/\D/g, '');
    push({ from: 'me', kind: 'text', text: '••••••' });
    if (code.length < 4) { interaction('error', 'Sign-in code too short'); bot(L.badCode); return; }
    setBusy(true); typing();
    try {
      const out = await api.verifyCode(mobile, code, false, false, termsOk);
      if (!out.ok) { bot(`⚠️ ${out.message}`); return; }
      await signIn(out.token, out.user);
      // Their earlier conversation (saved on this device) first, then this visit's messages.
      if (out.user?.id) {
        const earlier = loadFor(out.user.id);
        setItems((cur) => [...earlier, ...cur.filter((x) => !earlier.some((e) => e.id === x.id))]);
        loadedFor.current = out.user.id;
      }
      setMode('plate');
      bot(L.signedIn);
      await welcome({ justSignedIn: true });
      // Highly recommended while WhatsApp is disabled: a confirmed email is how alerts reach them.
      if (!out.user?.email_verified) { emailNudge(); markNudged(out.user?.id); }
      // Signed in from an old account address: on to where they were going.
      const after = afterSignIn.current; afterSignIn.current = null;
      if (after?.next) { navigate(after.next); return; }
      if (after?.open) setTimeout(() => (after.open === 'profile' ? showProfile() : showList(after.open)), 600);
      // Right after signing in: offer notifications (only where the browser can, and not if already on).
      const ns = await notify.state().catch(() => 'unsupported');
      setNotifyState(ns);
      if (ns === 'off') push({ from: 'bot', kind: 'notify' });
      if (pendingReg) {
        // The number typed before signing in is checked now, without asking again (2026-10-08).
        const reg = pendingReg;
        setPendingReg(null);
        setTimeout(() => check(reg, { signedIn: true }), 400);
      }
    } catch (e) { bot(`⚠️ ${e.message}`); } finally { setBusy(false); }
  }

  /* ──────── name and email (2026-10-07): highly recommended while WhatsApp is off ── */

  function emailNudge() { push({ from: 'bot', kind: 'text', text: L.emailNudge, chips: ['addEmail', 'later'] }); }
  /* Signed in already and still no confirmed email: reminded once a day on this device, not every visit. */
  const NUDGE = (id) => `gp.emailNudge.${id}`;
  const todayIst = () => new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 10);
  function markNudged(id) { try { if (id) localStorage.setItem(NUDGE(id), todayIst()); } catch { /* private mode */ } }
  function nudgeDue(id) { try { return localStorage.getItem(NUDGE(id)) !== todayIst(); } catch { return true; } }

  function startProfile() {
    const first = String(me?.name || '').split(/\s+/)[0];
    if (me?.name) { setPendingName(''); setMode('email'); bot(L.askEmail(first)); }
    else { setMode('name'); bot(L.askName); }
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function sendName(text) {
    const n = String(text).trim().replace(/\s+/g, ' ');
    push({ from: 'me', kind: 'text', text: n });
    if (!/^[\p{L}\p{M}][\p{L}\p{M} .'-]{1,59}$/u.test(n)) { bot(L.badName); return; }
    setPendingName(n); setMode('email');
    bot(L.askEmail(n.split(' ')[0]));
  }

  async function sendEmail(text, { echo = true } = {}) {
    const e = String(text).trim().toLowerCase();
    if (echo) push({ from: 'me', kind: 'text', text: e });
    setBusy(true); typing();
    try {
      // The name is saved first; the email is confirmed with a code typed right here (2026-10-07).
      if (pendingName) { const o = await api.saveMe({ name: pendingName }); setMe?.(o.user); setPendingName(''); }
      if (me?.email_verified && String(me.email).toLowerCase() === e) { setMode('plate'); bot(`${L.emailSame(e)} ${L.emailOk}`); return; }
      const out = await api.emailCode(e);
      setPendingEmail(e); setMode('ecode');
      bot(L.emailCodeSent(e) + (out.dev ? '\n\n_(testing: the code is in the server log)_' : ''));
    } catch (err) {
      const b = err.body || {};
      if (b.error === 'bad_name') { setMode('name'); bot(`⚠️ ${err.message}`); return; }
      // Stay on the email step: they can type it again, or take the suggested spelling.
      bot(`⚠️ ${err.message}`, { chips: b.suggestion ? [`useEmail:${b.suggestion}`] : [] });
    } finally { setBusy(false); }
  }

  async function sendEmailCode(text) {
    const code = String(text).replace(/\D/g, '');
    push({ from: 'me', kind: 'text', text: '••••••' });
    if (code.length !== 6) { bot(L.badEmailCode); return; }
    setBusy(true); typing();
    try {
      const out = await api.emailVerify(pendingEmail, code);
      setMe?.(out.user); setMode('plate'); setPendingEmail('');
      bot(L.emailVerifiedNow);
    } catch (err) { bot(`⚠️ ${err.message}`); }
    finally { setBusy(false); }
  }

  async function resendLink() {
    try { const out = await api.resendEmail(); bot(out.already ? L.emailOk : L.resent); }
    catch (e) { bot(`⚠️ ${e.message}`); }
  }

  /* ────────────── the account, inside the conversation (no other pages) ── */

  /** One vehicle as a card: the full report if they own one, else the free view.
      Straight after paying ({ afterPayment }), the report may still be on its way:
      ask again for up to ~30 seconds before showing what there is. */
  async function openVehicle(reg, { afterPayment = false } = {}) {
    setBusy(true); typing();
    try {
      let out = await api.vehicle(reg);
      for (let i = 0; afterPayment && i < 12 && !(out.report || out.vehicle?.paid); i += 1) {
        await new Promise((r) => setTimeout(r, 2500));
        out = await api.vehicle(reg).catch(() => out);
      }
      if (out.error || !out.vehicle) { bot(`⚠️ ${out.message || 'Could not open that vehicle.'}`); return; }
      push({ from: 'bot', kind: 'vehicle', vehicle: out.vehicle, paid: Boolean(out.vehicle.paid), report: out.report || null,
             price: out.price_paise, signedIn: true });
      /* THE GST INVOICE TOO, right after paying (2026-10-07): this vehicle's newest
         invoice with its download button, waited for briefly while its PDF is made. */
      if (afterPayment) {
        let inv = null;
        for (let i = 0; i < 8; i += 1) {
          const list = await api.invoices().catch(() => null);
          inv = (list?.rows || []).find((x) => cleanPlate(x.reg_no || '') === cleanPlate(reg)) || null;
          if (inv?.downloadable) break;
          await new Promise((r) => setTimeout(r, 2500));
        }
        if (inv) push({ from: 'bot', kind: 'invoices', rows: [inv] });
      }
    } catch (e) { bot(`⚠️ ${e.message}`); } finally { setBusy(false); }
  }

  async function showList(kind) {
    journey({ step: 'reports', section: { vehicles: 'my vehicles', reports: 'my reports', invoices: 'my invoices' }[kind] });
    const label = { vehicles: L.myVehicles, reports: L.myReports, invoices: L.invoices }[kind];
    push({ from: 'me', kind: 'text', text: label });
    setBusy(true); typing();
    try {
      const out = await (kind === 'vehicles' ? api.vehicles() : kind === 'reports' ? api.reports() : api.invoices());
      const rows = out.rows || [];
      if (!rows.length) { bot({ vehicles: L.noVehicles, reports: L.noReports, invoices: L.noInvoices }[kind], { chips: ['another'] }); return; }
      push({ from: 'bot', kind, rows });
    } catch (e) { bot(`⚠️ ${e.message}`); } finally { setBusy(false); }
  }

  async function showProfile() {
    journey({ step: 'profile', section: 'profile' });
    push({ from: 'me', kind: 'text', text: L.profile });
    setBusy(true); typing();
    try {
      const out = await api.me();
      push({ from: 'bot', kind: 'profile', user: out.user || out });
    } catch (e) { bot(`⚠️ ${e.message}`); } finally { setBusy(false); }
  }

  async function download(kind, row) {
    try {
      const { blob, filename } = await (kind === 'invoice' ? api.invoicePdf(row.id, true) : api.reportPdf(row.id, true));
      saveBlob(blob, filename);
    } catch (e) { bot(`⚠️ ${e.message}`); }
  }

  /* ── the ⋮ menu's own cards ── */
  function showCard(kind, label) {
    setMenuOpen(false);
    push({ from: 'me', kind: 'text', text: label });
    push({ from: 'bot', kind });
  }
  async function saveEmail(email) {
    const e = String(email || '').trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(e)) { bot(L.emailBad); return false; }
    try {
      const out = await api.saveMe({ email: e });
      setMe?.(out.user);
      bot(out.email_confirmation_sent ? L.emailConfirm(e) : L.emailSaved);
      return true;
    } catch (err) {
      bot(`⚠️ ${err.message}`, { chips: err.body?.suggestion ? [`useEmail:${err.body.suggestion}`] : [] });
      return false;
    }
  }
  async function deactivate(reason) {
    try {
      await notify.disable().catch(() => {});
      const out = await api.deactivate(reason || '');
      // The screen resets to a fresh welcome when the sign-in ends (the effect on `me`), with this note on top.
      resetNote.current = `✅ ${out.message || 'Your account is deactivated.'}`;
      await signOut().catch(() => {});
    } catch (e) { bot(`⚠️ ${e.message}`); }
  }
  async function allowNotifications() {
    try {
      const s = await notify.enable();
      setNotifyState(s);
      bot(s === 'on' ? L.notifyOn : s === 'blocked' ? L.notifyBlocked : s === 'unsupported' ? L.notifyUnsupported : L.notifyOffNow);
    } catch (e) { bot(`⚠️ ${e.message}`); }
  }
  async function notificationsMenu() {
    setMenuOpen(false);
    push({ from: 'me', kind: 'text', text: L.mNotify });
    const s = await notify.state().catch(() => 'unsupported');
    setNotifyState(s);
    if (s === 'on') bot(L.notifyIsOn, { chips: ['notifyOff'] });
    else if (s === 'blocked') bot(L.notifyBlocked);
    else if (s === 'unsupported') bot(L.notifyUnsupported);
    else push({ from: 'bot', kind: 'notify' });
  }

  async function doSignOut() {
    setMenuOpen(false);
    // This phone stops getting the account's notifications (they would belong to someone else next).
    await notify.disable().catch(() => {});
    resetNote.current = `↪ ${lang === 'hi' ? 'आप साइन आउट हो गए।' : 'You are signed out.'}`;
    await signOut().catch(() => {});
  }

  /* ────────────────────────────── chips and buttons ── */

  function chip(key) {
    // "What do I get?" lives with the signed-in options now (user, 2026-10-08: the welcome already says it all).
    if (key === 'howWorks') { push({ from: 'me', kind: 'text', text: L.howWorks }); bot(L.howAnswer, { chips: me ? ['another'] : ['signIn'] }); return; }
    // The sample report on a made-up vehicle, and the full description (2026-10-08).
    if (key === 'sample') {
      journey({ step: 'welcome', section: 'sample report' });
      push({ from: 'me', kind: 'text', text: L.sample.chip });
      bot(L.sample.intro);
      push({ from: 'bot', kind: 'sample' });
      return;
    }
    if (key === 'fullInfo') {
      journey({ step: 'welcome', section: 'full details' });
      push({ from: 'me', kind: 'text', text: L.sample.more });
      bot(L.helloSignIn, { chips: me ? [] : ['sample'] });
      return;
    }
    if (key === 'another') { setMode('plate'); inputRef.current?.focus(); return; }
    if (key === 'signIn') { startSignIn(); return; }
    if (key === 'myVehicles') { showList('vehicles'); return; }
    if (key === 'myReports') { showList('reports'); return; }
    if (key === 'invoices') { showList('invoices'); return; }
    if (key === 'profile') { showProfile(); return; }
    if (key === 'notifyOff') { notify.disable().then(() => { setNotifyState('off'); bot(L.notifyOffNow); }); return; }
    if (key === 'addEmail') { push({ from: 'me', kind: 'text', text: L.addEmail }); startProfile(); return; }
    if (key === 'later') { push({ from: 'me', kind: 'text', text: L.later }); bot(L.laterOk); return; }
    if (key === 'resendEmail') { push({ from: 'me', kind: 'text', text: L.resend }); resendLink(); return; }
    if (key.startsWith('useEmail:')) { push({ from: 'me', kind: 'text', text: key.slice(9) }); sendEmail(key.slice(9), { echo: false }); return; }
    if (key.startsWith('open:')) { push({ from: 'me', kind: 'plate', text: prettyPlate(key.slice(5)) }); openVehicle(key.slice(5)); }
  }
  const chipLabel = (key) => (key.startsWith('open:') ? `🔓 ${prettyPlate(key.slice(5))}` : {
    howWorks: `❓ ${L.howWorks}`, another: `🔍 ${L.another}`, signIn: `🔐 ${L.signIn}`,
    myVehicles: `🚗 ${L.myVehicles}`, myReports: `📄 ${L.myReports}`, profile: `👤 ${L.profile}`, invoices: `🧾 ${L.invoices}`,
    sample: L.sample.chip, fullInfo: L.sample.more,
    notifyOff: `🔕 ${L.turnOff}`, addEmail: `📧 ${L.addEmail}`, later: `⏰ ${L.later}`, resendEmail: `↻ ${L.resend}`,
  }[key] || (key.startsWith('useEmail:') ? `✓ ${L.didYouMean(key.slice(9))}` : key));

  // The payment window opens over the chat; paying returns to /chat?paid=REG.
  function fullReport(reg, price) {
    if (me) setBuying({ reg, price });
    else { push({ from: 'me', kind: 'text', text: L.fullReport('').trim() }); startSignIn(reg); }
  }

  // Nothing until the saved sign-in is known — "Sign in" must never flash for someone signed in.
  const quick = !ready ? [] : me
    ? [...(me.email_verified ? [] : ['addEmail']), 'another', 'myVehicles', 'myReports', 'invoices', 'howWorks', 'profile'] : ['signIn'];
  const placeholder = { mobile: L.placeholderMobile, code: L.placeholderCode, ecode: L.placeholderCode, name: L.placeholderName, email: L.placeholderEmail }[mode] || L.placeholderPlate;
  const typed = mode === 'name' || mode === 'email';   // free text: no capitals forced, no digit spacing
  const plateHint = mode === 'plate' && looksLikePlate(input);

  return (
    <div className="gp-chat-bg flex h-[100dvh] flex-col">
      {/* GaadiPe's own moving background (index.css) — clearly not WhatsApp. */}
      <div className="gp-glows" aria-hidden="true"><span className="a" /><span className="b" /><span className="c" /><span className="road" /></div>
      {/* The top bar: who you are talking to, why it can be trusted, a way home. */}
      <header className="z-10 bg-gradient-to-r from-[#0a4f49] via-[#0f766e] to-[#14a08f] text-white shadow-md"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-3 py-2.5">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-sm font-black text-[#0f766e] shadow">GP</div>
          <div className="min-w-0 flex-1 leading-tight">
            <div className="flex items-center gap-1 font-bold">GaadiPe
              <svg viewBox="0 0 24 24" className="h-4 w-4 text-[#ffd84d]" fill="currentColor" aria-label="verified"><path d="M12 2l2.4 2.1 3.2-.4.9 3.1 2.8 1.6-1.2 3 1.2 3-2.8 1.6-.9 3.1-3.2-.4L12 22l-2.4-2.1-3.2.4-.9-3.1L2.7 15.6l1.2-3-1.2-3 2.8-1.6.9-3.1 3.2.4z"/><path d="M10.5 15.5l-3-3 1.4-1.4 1.6 1.6 4.6-4.6 1.4 1.4z" fill="#0f766e"/></svg>
            </div>
            <div className="text-[11px] text-white/80">{busy || items.some((x) => x.kind === 'typing') ?(lang === 'hi' ? 'लिख रहा है…' : 'typing…') : L.online}</div>
          </div>
          {/* Hindi / English in one tap (user, 2026-10-08: "I don't see the Hindi toggle") — it
              was only inside the menu. Shows the language it switches TO. */}
          <button type="button" data-test="lang-toggle" onClick={() => setLang(lang === 'hi' ? 'en' : 'hi')}
            aria-label={lang === 'hi' ? 'Switch to English' : 'हिंदी में बदलें'}
            className="flex items-center gap-1 rounded-full border border-white/40 bg-white/10 px-2.5 py-1 text-[12px] font-bold hover:bg-white/25 active:scale-95">
            <span aria-hidden="true">🌐</span>{lang === 'hi' ? 'EN' : 'हिंदी'}
          </button>
          {/* On a phone just the house, so the name, language and Menu all fit. */}
          <Link to="/?home=1" aria-label={L.home} className="rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold hover:bg-white/25">
            <span className="sm:hidden" aria-hidden="true">🏠</span><span className="hidden sm:inline">{L.home} ↗</span>
          </Link>
          {/* The menu: every account option, in the conversation — labelled in words, not just ⋮ (2026-10-08). */}
          <button type="button" data-test="menu" aria-label={L.menu} aria-expanded={menuOpen} onClick={() => { hideMenuHint(); setMenuOpen((v) => !v); }}
            className={`flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[12.5px] font-bold text-[#0a4f49] shadow active:scale-95 ${menuHint ? 'gp-menu-pulse' : ''}`}>
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
            {L.menu}
          </button>
        </div>
        {menuHint && !menuOpen ? (
          <div className="relative mx-auto max-w-2xl">
            <div className="gp-pop absolute right-3 top-1 z-30 w-[min(17rem,80vw)] rounded-2xl bg-[#ffd84d] p-3 text-[13px] text-[#0a4f49] shadow-xl" style={{ transformOrigin: '90% 0' }} role="status">
              <span className="absolute -top-1.5 right-7 h-3 w-3 rotate-45 bg-[#ffd84d]" />
              <div className="font-semibold leading-snug">👆 {L.menuHint}</div>
              <div className="mt-2 flex justify-end gap-2">
                <button type="button" onClick={hideMenuHint} className="rounded-full px-3 py-1 text-[12px] font-bold text-[#0a4f49]/70">{L.gotIt}</button>
                <button type="button" onClick={() => { hideMenuHint(); setMenuOpen(true); }} className="rounded-full bg-[#0a4f49] px-3 py-1 text-[12px] font-bold text-white">☰ {L.menu}</button>
              </div>
            </div>
          </div>
        ) : null}
        <div className="bg-black/15 px-3 py-1 text-center text-[10.5px] text-white/90">{L.trust}</div>
      </header>

      {/* The conversation. */}
      <main ref={listRef} className="flex-1 overflow-y-auto">
        <div ref={innerRef} className="mx-auto flex max-w-2xl flex-col gap-2 px-3 pb-8 pt-4">
          {me && history.items.length > 0 && (
            <>
              {history.more && (
                <button type="button" onClick={loadEarlier} className="mx-auto rounded-full bg-white/80 px-3 py-1 text-[11px] font-semibold text-[#0f766e] shadow-sm">
                  ↑ {L.loadEarlier}
                </button>
              )}
              <Divider>{L.waDivider}</Divider>
              {history.items.map((h) => <Bubble key={`wa-${h.id}`} item={h} faded onChip={() => {}} chipLabel={(c) => c} L={L} />)}
              <Divider>{L.nowHere}</Divider>
            </>
          )}
          {items.map((it) => {
            if (it.kind === 'vehicle' && it.paid && it.vehicle?.paid) {
              return <FullCard key={it.id} it={it} L={L} onDownload={() => it.report && download('report', it.report)} onAnother={() => chip('another')} />;
            }
            if (it.kind === 'vehicle') {
              return <VehicleCard key={it.id} it={it} L={L} onFull={() => (it.paid ? openVehicle(it.vehicle.reg_no) : fullReport(it.vehicle.reg_no, it.price))} onAnother={() => chip('another')} />;
            }
            if (it.kind === 'consent') {
              return <ConsentCard key={it.id} it={it} L={L} busy={busy} onAgree={() => freeCheck(it.reg, it.id)} />;
            }
            if (it.kind === 'freeVehicle') {
              return <FreeVehicleCard key={it.id} it={it} L={L}
                onBuy={() => fullReport(it.vehicle.reg_no, it.price)} onSignIn={() => startSignIn()} />;
            }
            if (it.kind === 'sample') {
              return <FullCard key={it.id} it={{ vehicle: sampleVehicle(), sample: true }} L={L}
                onSignIn={() => (me ? chip('another') : startSignIn())} />;
            }
            if (it.kind === 'vehicles') {
              return <VehiclesList key={it.id} rows={it.rows} L={L} onOpen={(index) => setRcAt({ rows: it.rows, index })}
                onRemove={async (reg) => {
                  await api.removeVehicle(reg);
                  journey({ step: 'reports', section: `removed ${reg}` });
                  return true;
                }}
                onRemoved={(reg) => {
                  // Gone from every list on screen (and from the saved conversation).
                  setItems((cur) => cur.map((x) => (x.kind === 'vehicles' ? { ...x, rows: x.rows.filter((r) => r.reg_no !== reg) } : x)));
                  bot(L.rm.done(prettyPlate(reg)), { pace: 300 });
                }} />;
            }
            if (it.kind === 'reports' || it.kind === 'invoices') {
              return <DocsList key={it.id} kind={it.kind} rows={it.rows} L={L} onDownload={(row) => download(it.kind === 'invoices' ? 'invoice' : 'report', row)} />;
            }
            if (it.kind === 'email') return <EmailCard key={it.id} L={L} current={me?.email} onSave={saveEmail} />;
            if (it.kind === 'deactivate') return <DeactivateCard key={it.id} L={L} onConfirm={deactivate} onCancel={() => bot(L.cancelled)} />;
            if (it.kind === 'signout') return <SignOutCard key={it.id} L={L} onConfirm={doSignOut} onCancel={() => bot(L.cancelled)} />;
            if (it.kind === 'terms') return <TermsLine key={it.id} L={L} />;
            if (it.kind === 'notify') return <NotifyCard key={it.id} L={L} state={notifyState} onAllow={allowNotifications} onLater={() => bot(lang === 'hi' ? 'ठीक है। मेनू ⋮ → नोटिफ़िकेशन से कभी भी चालू करें।' : 'OK. Turn them on any time from the menu ⋮ → Notifications.')} />;
            if (it.kind === 'help') return <CardShell key={it.id} title={L.helpH}><div className="text-[13.5px] text-[#0b2e2b]"><Text text={L.helpBody} /></div>
              <a href="mailto:support@gaadipe.in" className="mt-2 inline-block rounded-full bg-[#0f766e] px-3 py-1.5 text-[12px] font-bold text-white">✉️ support@gaadipe.in</a></CardShell>;
            if (it.kind === 'profile') {
              return <ProfileCard key={it.id} user={me ? { ...it.user, ...me } : it.user} L={L}
                onPromo={async (agree) => { const out = await api.setPromoConsent(agree); setMe?.(out.user); return out.user; }}
                onSaveName={async (name) => { const out = await api.saveMe({ name }); setMe?.(out.user); return out; }}
                onVerified={(u) => { setMe?.(u); bot(L.emailVerifiedNow); }}
                onSwitched={async (out) => {
                  // Signed in on the new number: its own (fresh) conversation, and a word on what happened.
                  resetNote.current = `📱 ${L.switched(prettyMobile(out.user?.mobile))}${out.transfer_request_id ? `\n\n${L.transferSent}` : ''}`;
                  await signIn(out.token, out.user);
                }} />;
            }
            return <Bubble key={it.id} item={it} onChip={chip} chipLabel={chipLabel} L={L} />;
          })}
        </div>
      </main>

      {/* Quick actions and the composer, above the keyboard. */}
      <footer className="border-t border-black/5 bg-white/95 backdrop-blur" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="mx-auto max-w-2xl">
          <div className="flex gap-2 overflow-x-auto px-3 pt-2 [scrollbar-width:none]">
            {quick.map((k) => (
              <button key={k} type="button" data-test={`quick-${k}`} onClick={() => chip(k)}
                className="shrink-0 rounded-full border border-[#0f766e]/20 bg-[#0f766e]/5 px-3 py-1.5 text-xs font-semibold text-[#0a4f49] active:scale-95">
                {chipLabel(k)}
              </button>
            ))}
          </div>
          <form className="flex items-end gap-2 px-3 py-2" onSubmit={(e) => { e.preventDefault(); send(); }}>
            <div className="relative flex-1">
              <input ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} placeholder={placeholder}
                type={mode === 'email' ? 'email' : 'text'}
                inputMode={mode === 'email' ? 'email' : mode === 'plate' || mode === 'name' ? 'text' : 'numeric'}
                autoComplete={{ mobile: 'tel', code: 'one-time-code', ecode: 'one-time-code', name: 'name', email: 'email' }[mode] || 'off'}
                autoCapitalize={mode === 'name' ? 'words' : mode === 'email' ? 'none' : undefined}
                maxLength={{ code: 6, ecode: 6, name: 60, email: 160 }[mode] || 20} disabled={busy}
                className={`w-full rounded-2xl border bg-[#f6f9f9] px-4 py-3 text-[15px] outline-none transition focus:border-[#0f766e] focus:bg-white ${mode === 'plate' ? 'uppercase tracking-wider' : typed ? '' : 'tracking-widest'} placeholder:normal-case placeholder:tracking-normal ${plateHint ? 'border-[#12a150]' : 'border-black/10'}`} />
              {plateHint && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#12a150]">✓ {prettyPlate(input)}</span>}
            </div>
            <button type="submit" disabled={busy || !input.trim()} aria-label="Send"
              className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#0f766e] text-white shadow-md transition active:scale-90 disabled:opacity-40">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><path d="M3 20.5l18-8.5L3 3.5v6.6l12 1.9-12 1.9z" /></svg>
            </button>
          </form>
        </div>
      </footer>

      {menuOpen && (
        <Menu L={L} me={me} notifyState={notifyState} lang={lang} onClose={() => setMenuOpen(false)} items={me ? [
          ['👤', L.profile, () => { setMenuOpen(false); showProfile(); }, 'profile'],
          ['✉️', L.mEmail, () => showCard('email', L.mEmail), 'email'],
          ['🚗', L.mHistory, () => { setMenuOpen(false); showList('vehicles'); }, 'vehicles'],
          ['📄', L.myReports, () => { setMenuOpen(false); showList('reports'); }, 'reports'],
          ['🧾', L.invoices, () => { setMenuOpen(false); showList('invoices'); }, 'invoices'],
          ['🔔', `${L.mNotify}${notifyState === 'on' ? ' ✓' : ''}`, notificationsMenu, 'notify'],
          ['🌐', L.mLang, () => { setMenuOpen(false); setLang(lang === 'hi' ? 'en' : 'hi'); }, 'lang'],
          ['💡', L.howWorks, () => { setMenuOpen(false); chip('howWorks'); }, 'how'],
          ['❓', L.mHelp, () => showCard('help', L.mHelp), 'help'],
          ['📜', L.mTerms, () => { setMenuOpen(false); window.open('/terms', '_blank', 'noopener'); }, 'terms'],
          ['↪', L.signOut, () => showCard('signout', L.signOut), 'signout', 'warn'],
          ['⛔', L.mDeactivate, () => showCard('deactivate', L.mDeactivate), 'deactivate', 'danger'],
        ] : [
          ['🔐', L.signIn, () => { setMenuOpen(false); startSignIn(); }, 'signin'],
          ['🌐', L.mLang, () => { setMenuOpen(false); setLang(lang === 'hi' ? 'en' : 'hi'); }, 'lang'],
          ['✉️', L.mHelp, () => showCard('help', L.mHelp), 'help'],
          ['📜', L.mTerms, () => { setMenuOpen(false); window.open('/terms', '_blank', 'noopener'); }, 'terms'],
        ]} />
      )}

      {/* Paying: the declaration and checkout open over the chat (BuyDialog); the
          payment page returns to /chat?paid=REG, where the report opens. */}
      {rcAt && (
        <RcViewer rows={rcAt.rows} index={rcAt.index} L={L} onIndex={(index) => setRcAt((s) => ({ ...s, index }))}
          onClose={() => setRcAt(null)} onDownload={download}
          onBuy={(reg, price) => { setRcAt(null); fullReport(reg, price); }}
          onRecheck={(reg) => { setRcAt(null); push({ from: 'me', kind: 'plate', text: prettyPlate(reg) }); openVehicle(reg); }} />
      )}
      {buying && (
        <BuyDialog regNo={buying.reg} pricePaise={buying.price} onClose={() => setBuying(null)}
          onAlreadyBought={() => { setBuying(null); openVehicle(buying.reg); }} />
      )}
    </div>
  );
}

/** The ⋮ menu: a sheet under the header, closed by a tap outside. */
function Menu({ items, onClose, me }) {
  const m = String(me?.mobile || '').slice(-10);
  return (
    <div className="fixed inset-0 z-40" onClick={onClose}>
      <div className="absolute inset-0 bg-black/20" />
      <div role="menu" onClick={(e) => e.stopPropagation()}
        className="gp-pop absolute right-2 w-64 overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5"
        style={{ top: 'calc(env(safe-area-inset-top) + 64px)' }}>
        {me && (
          <div className="border-b border-black/5 bg-gradient-to-r from-[#0f766e] to-[#14a08f] px-4 py-3 text-white">
            <div className="text-[14px] font-bold">{me.name || '-'}</div>
            <div className="text-[12px] text-white/80">{m ? `${m.slice(0, 5)} ${m.slice(5)}` : ''}</div>
          </div>
        )}
        {items.map(([icon, label, act, key, tone]) => (
          <button key={key} type="button" role="menuitem" data-test={`menu-${key}`} onClick={act}
            className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-[14px] active:bg-black/5 ${tone === 'danger' ? 'text-[#c62828]' : tone === 'warn' ? 'text-[#b26a00]' : 'text-[#0b2e2b]'}`}>
            <span className="w-5 text-center">{icon}</span><span>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

const CardShell = ({ title, children }) => (
  <div className="gp-pop flex flex-col items-start">
    <div className="w-[94%] max-w-md rounded-2xl rounded-bl-md bg-white p-3.5 shadow-md">
      <div className="mb-2 text-[14px] font-bold text-[#0b2e2b]">{title}</div>
      {children}
    </div>
  </div>
);

function EmailCard({ L, current, onSave }) {
  const [email, setEmail] = useState(current || '');
  const [busy, setBusy] = useState(false);
  return (
    <CardShell title={L.emailH}>
      <form className="flex gap-2" onSubmit={async (e) => { e.preventDefault(); setBusy(true); await onSave(email); setBusy(false); }}>
        <input type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={L.emailPh}
          data-test="email-input" className="min-w-0 flex-1 rounded-xl border border-black/10 bg-[#f6f9f9] px-3 py-2 text-[14px] outline-none focus:border-[#0f766e]" />
        <button type="submit" data-test="email-save" disabled={busy} className="rounded-xl bg-[#0f766e] px-4 text-[13px] font-bold text-white disabled:opacity-50">{L.save}</button>
      </form>
    </CardShell>
  );
}

/* SIGN OUT, ASKED FIRST (user, 2026-10-07: "a warning when tapping Sign out"). */
/* AGREED BY SIGNING IN (user, 2026-10-08: people read the opening, saw a box to
   tick and left — "no need to tick & go"). One small line under the welcome,
   with the three policies a tap away. Signing in is the agreement; the server
   records it at every sign-in (consent_accepted, method sign_in). */
function TermsLine({ L }) {
  const link = (href, label) => <a href={href} target="_blank" rel="noopener noreferrer" className="font-semibold text-[#0f766e] underline">{label}</a>;
  const t = L.termsByUse;
  return (
    <div className="anim-up flex">
      <p data-test="terms-notice" className="ml-1 max-w-[88%] px-1 text-[11.5px] leading-relaxed text-black/55">
        🔒 {t[0]} {link('/terms', t[1])}, {link('/privacy', t[2])} {t[3]} {link('/refund', t[4])}{/[.।]$/.test(t[4]) ? '' : '.'}
      </p>
    </div>
  );
}

/*
 * "AGREE & CHECK" (user, 2026-10-08): before the free check, the visitor agrees
 * to the Terms, Privacy and Refund policies and confirms a lawful purpose. The
 * exact words on this card are what is recorded with the check.
 */
function ConsentCard({ it, L, busy, onAgree }) {
  const link = (href, label) => <a href={href} target="_blank" rel="noopener noreferrer" className="font-semibold text-[#0f766e] underline">{label}</a>;
  const [terms, privacy, refund] = L.free.links;
  return (
    <div className="gp-pop gp-from-l flex flex-col items-start">
      <div className="w-[92%] max-w-sm overflow-hidden rounded-2xl rounded-bl-md bg-white shadow-md">
        <div className="flex items-center gap-2 border-b border-black/5 px-3.5 py-2.5">
          <span className="rounded-md border-2 border-[#111] bg-white px-2 py-0.5 font-mono text-[15px] font-black tracking-[1.5px] text-[#111]">{prettyPlate(it.reg)}</span>
          <span className="text-[13px] font-bold text-[#0b2e2b]">{L.free.consentH('').trim()}</span>
        </div>
        <p className="px-3.5 py-2.5 text-[12.5px] leading-relaxed text-black/70">{L.free.consent}</p>
        <p className="px-3.5 pb-2 text-[11.5px] text-black/50">📜 {link('/terms', terms)} · {link('/privacy', privacy)} · {link('/refund', refund)}</p>
        <button type="button" data-test="free-agree" disabled={it.agreed || busy} onClick={onAgree}
          className="gp-shine w-full bg-[#0f766e] py-3 text-[14.5px] font-black text-white active:brightness-95 disabled:opacity-60">
          {it.agreed ? '✓' : L.free.agree}
        </button>
      </div>
    </div>
  );
}

/* The RTO, worked out from the number: code, office, district, state (2026-10-10). */
function RtoLine({ rto, L }) {
  return (
    <div className="border-b border-black/5 px-3.5 py-2 text-[12px] text-[#0b2e2b]">
      🏛️ <b>{L.pub.rto} {rto.code}</b>{rto.office ? ` · ${rto.office}` : ''}{rto.district ? `, ${rto.district}` : ''}{rto.state ? ` · ${rto.state}` : ''}
    </div>
  );
}

/* How old, from the registration date: "19 yr 10 mo old". */
function ageOf(d, L) {
  const t = new Date(d);
  if (Number.isNaN(t.getTime())) return null;
  const now = new Date();
  let months = (now.getFullYear() - t.getFullYear()) * 12 + (now.getMonth() - t.getMonth());
  if (now.getDate() < t.getDate()) months -= 1;
  return months >= 0 ? L.pub.age(Math.floor(months / 12), months % 12) : null;
}

/*
 * THE PUBLIC RECORD, free after sign-in (2026-10-10, like CarInfo): the masked
 * owner, registration date and age, norms, seats, weight, RC status, every
 * validity date, and how many challans — then what the ₹19 report adds.
 */
function PublicFacts({ v, L }) {
  const id = v.identity || {};
  const f = v.found || {};
  const facts = [
    [L.pub.owner, id.owner_masked],
    [L.pub.regOn, id.reg_date ? `${day(id.reg_date)}${ageOf(id.reg_date, L) ? ` · ${ageOf(id.reg_date, L)}` : ''}` : null],
    [L.pub.rcStatus, id.rc_status],
    [L.pub.norms, id.norms],
    [L.pub.seats, id.seats],
    [L.pub.weight, id.unladen_weight ? `${id.unladen_weight} kg` : null],
  ].filter(([, val]) => val != null && val !== '');
  return (
    <div className="space-y-2.5">
      {facts.length > 0 && (
        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
          {facts.map(([k, val]) => (
            <div key={k} className="min-w-0">
              <div className="text-[10.5px] uppercase tracking-wide text-black/45">{k}</div>
              <div className="break-words text-[13px] font-semibold leading-snug text-[#0b2e2b]">{val}</div>
            </div>
          ))}
        </div>
      )}
      {(v.documents || []).length > 0 && (
        <div>
          <div className="mb-1 text-[10.5px] uppercase tracking-wide text-black/45">{L.pub.dates}</div>
          {v.documents.map((d) => (
            <div key={d.label} className="flex items-center justify-between gap-2 py-0.5">
              <span className="flex items-center gap-1.5 text-[13px] text-[#0b2e2b]"><Mark state={d.state} />{d.name || d.label}</span>
              <span className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold" style={{ color: STATE[d.state]?.[0], background: STATE[d.state]?.[1] }}>
                {L.daysLeft(d.days)}{d.valid_until ? ` · ${day(d.valid_until)}` : ''}
              </span>
            </div>
          ))}
        </div>
      )}
      <div className={`text-[13px] font-semibold ${f.challans_pending ? 'text-[#c62828]' : 'text-[#12813f]'}`}>{L.pub.challans(f.challans_pending || 0)}</div>
      {v.locked?.length > 0 && (
        <div className="rounded-xl bg-[#f3f7f6] p-2.5">
          <div className="mb-1 text-[11px] font-bold uppercase tracking-wider text-[#0f766e]">🔒 {L.pub.locked}</div>
          {v.locked.map((x) => <div key={x} className="text-[12.5px] text-black/60">• {x}</div>)}
        </div>
      )}
    </div>
  );
}

/* The buyer's verdict at the top of the paid view (2026-10-10). */
function Verdict({ lines, L }) {
  if (!lines?.length) return null;
  const tone = { wrong: ['#c62828', '#fdecea', '⛔'], watch: ['#b26a00', '#fff4e0', '⚠️'], good: ['#12813f', '#e7f6ec', '✅'] };
  return (
    <div className="border-b border-black/5 px-3.5 py-3">
      <div className="mb-1.5 text-[11px] font-black uppercase tracking-wider text-[#0a4f49]">🧭 {L.pub.verdictH}</div>
      {lines.map((l, i) => (
        <div key={i} className="mb-1.5 rounded-lg px-2.5 py-2 text-[12.8px] font-semibold leading-snug"
          style={{ color: tone[l.tone]?.[0], background: tone[l.tone]?.[1] }}>
          {tone[l.tone]?.[2]} {l.text}
        </div>
      ))}
    </div>
  );
}

/* The free check's answer: make, model name (variant hidden) and fuel — then the ₹19 offer. */
function FreeVehicleCard({ it, L, onBuy, onSignIn }) {
  const v = it.vehicle || {};
  const id = v.identity || {};
  return (
    <div className="anim-up flex flex-col items-start">
      <div className="w-[92%] max-w-sm overflow-hidden rounded-2xl rounded-bl-md bg-white shadow-md">
        <div className="bg-gradient-to-br from-[#0f766e] to-[#0a4f49] p-3.5 text-white">
          <div className="flex items-center justify-between gap-3">
            <span className="rounded-md border-2 border-black bg-white px-2.5 py-0.5 font-mono text-[17px] font-black tracking-[2px] text-black shadow">{prettyPlate(v.reg_no)}</span>
            <span className="text-[11px] font-semibold text-white/85">{L.free.found}</span>
          </div>
          <div className="mt-2 text-[17px] font-black" data-test="free-identity">
            {[id.maker, id.model ? `${id.model}${id.variant_hidden ? ' •••' : ''}` : null].filter(Boolean).join(' · ') || '—'}
          </div>
          {id.fuel || id.vehicle_class ? <div className="text-[12.5px] text-white/85">⛽ {[id.fuel, id.vehicle_class].filter(Boolean).join(' · ')}</div> : null}
          {id.owner_masked ? <div className="text-[12.5px] text-white/85">👤 {L.pub.owner}: {id.owner_masked}</div> : null}
          {id.variant_hidden ? <div className="mt-1 text-[11.5px] text-[#ffd84d]">🔒 {L.free.hidden}</div> : null}
        </div>
        {/* The RTO, from the number (2026-10-10, like CarInfo). */}
        {v.rto ? <RtoLine rto={v.rto} L={L} /> : null}
        <div className="px-3.5 py-2.5 text-[12.5px] leading-relaxed text-[#0b2e2b]"><Text text={L.free.inReport} /></div>
        <button type="button" data-test="free-buy" onClick={onBuy}
          className="gp-shine w-full bg-[#ffd84d] py-3 text-[14.5px] font-black text-[#0a4f49] active:brightness-95">{L.free.buy(rupee(it.price))}</button>
        <button type="button" data-test="free-signin" onClick={onSignIn}
          className="w-full border-t border-black/5 py-2.5 text-[13px] font-bold text-[#0f766e]">{L.free.signIn}</button>
      </div>
      <div className="mt-1.5 max-w-[88%] rounded-xl bg-white/80 px-3 py-2 text-[12px] text-[#0a4f49] shadow-sm"><Text text={L.free.more} /></div>
    </div>
  );
}

function SignOutCard({ L, onConfirm, onCancel }) {
  const [done, setDone] = useState(false);
  return (
    <CardShell title={L.signOutH}>
      <p className="text-[13px] leading-relaxed text-black/70">{L.signOutBody}</p>
      <div className="mt-2 flex gap-2">
        <button type="button" data-test="signout-confirm" disabled={done} onClick={() => { setDone(true); onConfirm(); }}
          className="flex-1 rounded-xl bg-[#b26a00] py-2.5 text-[13px] font-bold text-white disabled:opacity-50">↪ {L.signOutYes}</button>
        <button type="button" data-test="signout-cancel" disabled={done} onClick={() => { setDone(true); onCancel(); }}
          className="flex-1 rounded-xl border border-black/10 py-2.5 text-[13px] font-bold text-[#0b2e2b] disabled:opacity-50">{L.cancel}</button>
      </div>
    </CardShell>
  );
}

/* DEACTIVATE (user, 2026-10-07): a warning, a reason (required), and the truth —
   signing in again later starts a fresh, empty account. */
function DeactivateCard({ L, onConfirm, onCancel }) {
  const [pick, setPick] = useState('');
  const [more, setMore] = useState('');
  const [done, setDone] = useState(false);
  const other = pick === L.deactReasons[L.deactReasons.length - 1];
  const reason = [pick, more.trim()].filter(Boolean).join(' — ');
  const ok = pick && (!other || more.trim().length >= 3);
  return (
    <CardShell title={L.deactH}>
      <p className="text-[13px] leading-relaxed text-black/70">{L.deactBody}</p>
      <p className="mt-2 rounded-lg bg-[#fdecec] px-3 py-2 text-[12.5px] font-semibold text-[#912018]">⚠️ {L.deactFresh}</p>
      <div className="mt-2 text-[12px] font-bold text-[#0b2e2b]">{L.deactWhy}</div>
      <div className="mt-1 space-y-1">
        {L.deactReasons.map((r) => (
          <label key={r} className="flex items-center gap-2 text-[13px] text-[#0b2e2b]">
            <input type="radio" name="deact-reason" className="h-4 w-4 accent-[#c62828]" checked={pick === r} disabled={done} onChange={() => setPick(r)} />{r}
          </label>))}
      </div>
      <textarea value={more} onChange={(e) => setMore(e.target.value)} placeholder={other ? L.deactOther : L.deactReason} rows={2} maxLength={400} disabled={done}
        className="mt-2 w-full rounded-xl border border-black/10 bg-[#f6f9f9] px-3 py-2 text-[13px] outline-none focus:border-[#c62828]" />
      <div className="mt-2 flex gap-2">
        <button type="button" data-test="deactivate-confirm" disabled={done || !ok} onClick={() => { setDone(true); onConfirm(reason); }}
          className="flex-1 rounded-xl bg-[#c62828] py-2.5 text-[13px] font-bold text-white disabled:opacity-50">⛔ {L.deactBtn}</button>
        <button type="button" data-test="deactivate-cancel" disabled={done} onClick={() => { setDone(true); onCancel(); }}
          className="flex-1 rounded-xl border border-black/10 py-2.5 text-[13px] font-bold text-[#0b2e2b] disabled:opacity-50">{L.cancel}</button>
      </div>
    </CardShell>
  );
}

function NotifyCard({ L, state, onAllow, onLater }) {
  const [done, setDone] = useState(false);
  return (
    <div className="gp-pop flex flex-col items-start">
      <div className="w-[94%] max-w-md overflow-hidden rounded-2xl rounded-bl-md bg-white shadow-md">
        <div className="flex items-start gap-3 p-3.5">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#fff4cc] text-[22px]">🔔</div>
          <div className="text-[13.5px] leading-snug text-[#0b2e2b]"><Text text={L.notifyAsk} /></div>
        </div>
        <div className="grid grid-cols-2 border-t border-black/5">
          <button type="button" data-test="notify-allow" disabled={done || state === 'on'} onClick={() => { setDone(true); onAllow(); }}
            className="gp-shine bg-[#ffd84d] py-3 text-[13.5px] font-black text-[#0a4f49] disabled:opacity-50">{L.allow}</button>
          <button type="button" data-test="notify-later" disabled={done} onClick={() => { setDone(true); onLater(); }}
            className="py-3 text-[13.5px] font-bold text-[#0f766e] disabled:opacity-50">{L.notNow}</button>
        </div>
      </div>
    </div>
  );
}

/* Sample data for ?demo=full in local development (see above). */
const DEMO_FULL = {
  reg_no: 'KA02EX1480', pretty: 'KA 02 EX 1480', paid: true,
  identity: { maker: 'MARUTI SUZUKI', model: 'SWIFT VXI', fuel: 'Petrol', vehicle_class: 'Motor Car', colour: 'Red', manufactured: '03/2019' },
  documents: [
    { label: 'insurance', name: 'Insurance', valid_until: '2027-03-14', days: 158, state: 'valid' },
    { label: 'puc', name: 'PUC (emission test)', valid_until: '2026-10-12', days: 5, state: 'due' },
    { label: 'tax', name: 'Road tax', valid_until: '2034-03-01', days: 2700, state: 'valid' },
    { label: 'fitness', name: 'Fitness', valid_until: '2026-01-10', days: -270, state: 'expired' },
  ],
  challans: { pending_count: 2, pending_amount_paise: 150000, pending: [
    { challan_no: 'KA1', offence: 'Over-speeding', place: 'Bengaluru', date: '2026-08-14', amount_paise: 100000, status: 'Pending' },
    { challan_no: 'KA2', offence: 'Wrong parking', place: 'Bengaluru', date: '2026-07-02', amount_paise: 50000, status: 'Pending' } ] },
  ownership: { owner_serial: 2, owner_masked: 'R***** K****', financer: 'HDFC BANK LTD', blacklist_status: null },
  fastag: { active: true, balance: 245 },
};

/*
 * THE SAMPLE REPORT (user, 2026-10-08: "a sample report on a made-up vehicle,
 * no ULIP data, no risk"). XX is no state's code, so XX00AB0000 can never be a
 * real vehicle; every name is invented; dates are counted from today so the
 * sample always looks current. Never fetched, never stored.
 */
const sampleVehicle = () => {
  const on = (days) => new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
  return {
    reg_no: 'XX00AB0000', paid: true, sample: true,
    identity: { maker: 'MARUTI SUZUKI', model: 'SWIFT VXI', fuel: 'Petrol', vehicle_class: 'Motor Car', colour: 'Red', manufactured: '03/2019' },
    documents: [
      { label: 'insurance', name: 'Insurance', valid_until: on(158), days: 158, state: 'valid' },
      { label: 'puc', name: 'PUC (emission test)', valid_until: on(5), days: 5, state: 'due' },
      { label: 'tax', name: 'Road tax', valid_until: on(2700), days: 2700, state: 'valid' },
      { label: 'fitness', name: 'Fitness', valid_until: on(-270), days: -270, state: 'expired' },
    ],
    challans: { pending_count: 2, pending_amount_paise: 150000, pending: [
      { challan_no: 'S1', offence: 'Over-speeding', place: 'Sample City', date: on(-55), amount_paise: 100000, status: 'Pending' },
      { challan_no: 'S2', offence: 'Wrong parking', place: 'Sample City', date: on(-98), amount_paise: 50000, status: 'Pending' } ] },
    ownership: { owner_serial: 2, owner_masked: 'S***** K****', financer: 'SAMPLE BANK LTD', blacklist_status: null },
    fastag: { active: true, balance: 245 },
  };
};

const inr = (p) => (p == null ? '—' : `₹${(Number(p) / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`);
const day = (d) => { try { return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); } catch { return d || ''; } };
const STATE = { expired: ['#c62828', '#fdecea'], due: ['#b26a00', '#fff4e0'], valid: ['#12813f', '#e7f6ec'] };

/* A status mark beside a document or challan, like the PDF's (2026-10-08):
   green tick — all good; orange "!" — ends soon; red cross — expired / to pay. */
function Mark({ state, small = false }) {
  const s = small ? 14 : 18;
  const color = state === 'expired' ? '#c62828' : state === 'due' ? '#e07b00' : '#12813f';
  return (
    <svg width={s} height={s} viewBox="0 0 20 20" aria-label={state === 'expired' ? 'expired' : state === 'due' ? 'ends soon' : 'valid'} className="shrink-0">
      <circle cx="10" cy="10" r="10" fill={color} />
      {state === 'expired' ? <path d="M6.5 6.5l7 7M13.5 6.5l-7 7" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
        : state === 'due' ? <><path d="M10 4.8v6.4" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" /><circle cx="10" cy="14.8" r="1.4" fill="#fff" /></>
        : <path d="M5.6 10.4l3 3 5.8-6.6" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />}
    </svg>
  );
}

/** The full report, as a card in the conversation. */
function FullCard({ it, L, onDownload, onAnother, onSignIn }) {
  const v = it.vehicle || {};
  const id = v.identity || {};
  const docs = v.documents || [];
  const ch = v.challans || {};
  const own = v.ownership || {};
  const bad = docs.filter((d) => d.state !== 'valid').length + (ch.pending_count ? 1 : 0);
  const sample = Boolean(it.sample);    // the made-up sample: marked on every side, no download
  return (
    <div className="anim-up flex flex-col items-start">
      <div className={`relative w-[94%] max-w-md overflow-hidden rounded-2xl rounded-bl-md bg-white shadow-md ${sample ? 'ring-2 ring-[#e08700]/60' : ''}`}>
        {sample ? (
          <>
            <div className="bg-[#fff4e0] px-3 py-1.5 text-center text-[11.5px] font-black uppercase tracking-wider text-[#8f5600]">🧪 {L.sample.ribbon}</div>
            {/* Marked wherever it is scrolled to, not only at the top. */}
            <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-around overflow-hidden" aria-hidden="true">
              {[0, 1, 2].map((i) => (
                <span key={i} className="-rotate-[24deg] whitespace-nowrap text-[44px] font-black tracking-[.3em] text-[#e08700]/[.13]">{L.sample.badge}</span>
              ))}
            </div>
          </>
        ) : null}
        <div className="bg-gradient-to-br from-[#0f766e] to-[#0a4f49] p-3.5 text-white">
          <div className="flex items-center justify-between gap-3">
            <span className="rounded-md border-2 border-black bg-white px-2.5 py-0.5 font-mono text-[17px] font-black tracking-[2px] text-black shadow">{prettyPlate(v.reg_no)}</span>
            <span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${sample ? 'bg-[#e08700] text-white' : 'bg-[#ffd84d] text-[#0a4f49]'}`}>{sample ? L.sample.badge : 'FULL REPORT'}</span>
          </div>
          <div className="mt-2 text-[15px] font-bold">{[id.maker, id.model].filter(Boolean).join(' · ')}</div>
          <div className="text-[12px] text-white/80">{[id.fuel, id.vehicle_class, id.colour, id.manufactured].filter(Boolean).join(' · ')}</div>
          <div className="mt-1 text-[12px] text-white/80">{bad ? `⚠️ ${bad} need attention` : '✅ All in order'}</div>
        </div>
        <Verdict lines={v.verdict} L={L} />
        {v.rto ? <RtoLine rto={v.rto} L={L} /> : null}

        <Section title={`📋 ${L.documents}`}>
          {docs.map((d) => (
            <div key={d.label} className="flex items-center justify-between gap-2 py-1">
              {/* Green tick: valid · orange: ends soon · red: expired (2026-10-08). */}
              <span className="flex items-center gap-1.5 text-[13px] text-[#0b2e2b]"><Mark state={d.state} />{d.name || d.label}</span>
              <span className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold" style={{ color: STATE[d.state]?.[0], background: STATE[d.state]?.[1] }}>
                {L.daysLeft(d.days)}{d.valid_until ? ` · ${day(d.valid_until)}` : ''}
              </span>
            </div>
          ))}
        </Section>

        <Section title={`🚨 ${L.challansH}`}>
          {ch.pending_count ? (
            <>
              <div className="flex items-center gap-1.5 text-[13px] font-bold text-[#c62828]"><Mark state="expired" />{L.pendingAmt(ch.pending_count, inr(ch.pending_amount_paise))}</div>
              {(ch.pending || []).slice(0, 6).map((c, i) => (
                <div key={c.challan_no || i} className="mt-1.5 rounded-lg bg-[#fdecea]/50 p-2 text-[12.5px]">
                  <div className="flex justify-between gap-2 font-semibold text-[#0b2e2b]"><span className="flex items-center gap-1.5"><Mark state="expired" small />{c.offence || 'Challan'}</span><span>{inr(c.amount_paise)}</span></div>
                  <div className="text-black/50">{[c.place, c.date ? day(c.date) : null, c.status].filter(Boolean).join(' · ')}</div>
                </div>
              ))}
            </>
          ) : <div className="flex items-center gap-1.5 text-[13px] font-semibold text-[#12813f]"><Mark state="valid" />{L.noChallans}</div>}
        </Section>

        <Section title={`🏦 ${L.ownership}`}>
          {own.owner_serial != null && <Row k={L.owners(own.owner_serial)} v={own.owner_masked || ''} />}
          <Row k={L.loan} v={own.financer || L.noLoan} tone={own.financer ? 'due' : 'valid'} />
          {own.blacklist_status && <Row k={L.blacklist} v={own.blacklist_status} tone="expired" />}
        </Section>

        {v.fastag && (
          <Section title={`🛣 ${L.fastag}`}>
            <Row k={v.fastag.active ? 'Active' : 'Not active'} v={v.fastag.balance != null ? inr(Number(v.fastag.balance) * 100) : ''} tone={v.fastag.active ? 'valid' : 'expired'} />
          </Section>
        )}

        {sample ? (
          <button type="button" data-test="sample-signin" onClick={onSignIn}
            className="gp-shine w-full border-t border-black/5 bg-[#ffd84d] py-3 text-[14px] font-black text-[#0a4f49] active:brightness-95">{L.sample.cta}</button>
        ) : (
          <div className="grid grid-cols-2 border-t border-black/5">
            <button type="button" data-test="full-download" onClick={onDownload} disabled={!it.report} className="gp-shine bg-[#ffd84d] py-3 text-[14px] font-black text-[#0a4f49] disabled:opacity-50">📄 {L.download}</button>
            <button type="button" data-test="full-another" onClick={onAnother} className="py-3 text-[14px] font-bold text-[#0f766e]">🔍 {L.another}</button>
          </div>
        )}
      </div>
    </div>
  );
}

const Section = ({ title, children }) => (
  <div className="border-t border-black/5 px-3.5 py-2.5">
    <div className="mb-1 text-[11px] font-bold uppercase tracking-wider text-[#0f766e]">{title}</div>
    {children}
  </div>
);
const Row = ({ k, v, tone }) => (
  <div className="flex items-center justify-between gap-2 py-0.5 text-[13px]">
    <span className="text-black/60">{k}</span>
    <span className="text-right font-semibold" style={{ color: tone ? STATE[tone][0] : '#0b2e2b' }}>{v}</span>
  </div>
);

/*
 * MY VEHICLES AS NUMBER PLATES (user, 2026-10-08). Just the plates, each with
 * what it is underneath; a tap opens its RC card (RcViewer). Paid ones wear a
 * small gold "REPORT" tag.
 */
function VehiclesList({ rows, L, onOpen, onRemove, onRemoved }) {
  const [asking, setAsking] = useState(null);     // the row whose bin was tapped
  const [leaving, setLeaving] = useState(null);   // reg_no sliding out
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  /* THE BIN (user, 2026-10-08): a warning first, then the plate slides away. For
     the customer it is deleted; the server only hides it (see siteApi DELETE). */
  const confirm = async () => {
    const reg = asking.reg_no;
    setBusy(true); setErr(null);
    try {
      await onRemove(reg);
      setAsking(null); setLeaving(reg);
      setTimeout(() => { setLeaving(null); onRemoved(reg); }, 420);
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };
  return (
    <div className="anim-up flex flex-col items-start">
      <div className="w-[94%] max-w-md overflow-hidden rounded-2xl rounded-bl-md bg-white shadow-md">
        <div className="px-3.5 pt-3 text-[14px] font-bold text-[#0b2e2b]">{L.yourVehicles(rows.length)}</div>
        <div className="px-3.5 text-[11.5px] text-black/50">{rows.length ? L.tapPlate : L.rm.empty}</div>
        <div className="grid grid-cols-1 gap-2 p-3 sm:grid-cols-2">
          {rows.map((r, i) => (
            <div key={r.reg_no} style={{ animationDelay: `${0.08 + i * 0.06}s` }}
              className={`gp-pop gp-from-l group relative flex min-w-0 items-stretch rounded-xl border border-black/5 bg-gradient-to-br from-white to-[#f1f8f7] shadow-sm transition hover:shadow-md ${leaving === r.reg_no ? 'gp-leave' : ''}`}>
              <button type="button" data-test={`open-${r.reg_no}`} onClick={() => onOpen(i)}
                className="flex min-w-0 flex-1 flex-col items-start gap-1 p-2.5 text-left active:scale-[.98]">
                <span className="flex w-full items-center gap-2">
                  <span className="flex items-stretch overflow-hidden rounded-md border-2 border-[#111] bg-white shadow-sm">
                    <span className="flex w-4 items-center justify-center bg-[#1d4ed8] text-[6px] font-black text-white [writing-mode:vertical-rl]">IND</span>
                    <span className="px-1.5 py-0.5 font-mono text-[14px] font-black tracking-[1.5px] text-[#111]">{prettyPlate(r.reg_no)}</span>
                  </span>
                  {r.report_id ? <span className="rounded-full bg-[#ffd84d] px-1.5 py-0.5 text-[9px] font-black text-[#0a4f49]">REPORT</span> : null}
                </span>
                <span className="w-full truncate text-[12.5px] font-semibold text-[#0b2e2b]">{[r.maker, r.model].filter(Boolean).join(' ') || '—'}</span>
              </button>
              <button type="button" data-test={`remove-${r.reg_no}`} aria-label={L.rm.label(prettyPlate(r.reg_no))} onClick={() => { setErr(null); setAsking(r); }}
                className="grid w-11 shrink-0 place-items-center rounded-r-xl border-l border-black/5 text-black/35 transition hover:bg-[#fdecea] hover:text-[#c62828] active:scale-90">
                <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* On the page itself: inside the animated bubble a "fixed" box is held to the bubble. */}
      {asking ? createPortal(
        <div className="rc-back-drop fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-3 sm:items-center" role="dialog" aria-modal="true"
          onClick={(e) => { if (e.target === e.currentTarget && !busy) setAsking(null); }}>
          <div className="rc-in w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl" style={{ marginBottom: 'env(safe-area-inset-bottom)' }}>
            <div className="flex items-center gap-3 bg-[#fdecea] px-4 py-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#c62828] text-[18px] text-white">🗑</div>
              <div className="text-[15px] font-black text-[#7a1a12]">{L.rm.q(prettyPlate(asking.reg_no))}</div>
            </div>
            <div className="space-y-2 px-4 py-3 text-[13.5px] text-[#0b2e2b]">
              <div>{L.rm.body}</div>
              {asking.report_id ? <div className="flex gap-2 rounded-lg bg-[#e7f6ec] px-3 py-2 text-[12.5px] text-[#0a6c34]"><span>📄</span><span>{L.rm.report}</span></div> : null}
              {asking.watched ? <div className="flex gap-2 rounded-lg bg-[#fff4e0] px-3 py-2 text-[12.5px] text-[#8f5600]"><span>🔕</span><span>{L.rm.alerts}</span></div> : null}
              {err ? <div className="rounded-lg bg-[#fdecec] px-3 py-2 text-[12.5px] text-[#912018]">⚠️ {err}</div> : null}
            </div>
            <div className="grid grid-cols-2 gap-2 px-4 pb-4">
              <button type="button" data-test="remove-cancel" disabled={busy} onClick={() => setAsking(null)}
                className="rounded-xl border border-black/10 py-2.5 text-[14px] font-bold text-[#0b2e2b] active:scale-95">{L.rm.no}</button>
              <button type="button" data-test="remove-confirm" disabled={busy} onClick={confirm}
                className="rounded-xl bg-[#c62828] py-2.5 text-[14px] font-black text-white shadow active:scale-95 disabled:opacity-60">{busy ? '…' : L.rm.yes}</button>
            </div>
          </div>
        </div>,
        document.body,
      ) : null}
    </div>
  );
}

/*
 * THE RC CARD (user, 2026-10-08): "on tap of each vehicle number show a beautiful
 * RC card, and when the user swipes left or right, flip the card and show the
 * remaining details — with a back button to go to another vehicle".
 *
 *   front   what the vehicle is (identity, owner masked, chassis/engine masked)
 *   back    paid: documents with their marks, challans, loan, FASTag
 *           not paid: the same rows, blurred and locked, with the ₹19 offer
 *   paid    small ⬇ Report and ⬇ Invoice buttons under the card
 *
 * Opening a card reads the SAVED record (/vehicles/:reg/card) — never a new
 * Government lookup — and each is fetched once per opening of the viewer.
 * Phone back, Esc and "‹ My vehicles" close it; ‹ › move between vehicles.
 */
function RcViewer({ rows, index, L, onIndex, onClose, onDownload, onBuy, onRecheck }) {
  const R = L.rc;
  const reg = rows[index]?.reg_no;
  const cache = useRef(new Map());
  const [card, setCard] = useState({ loading: true });
  const [turn, setTurn] = useState(0);
  const [enter, setEnter] = useState('rc-in');
  const touch = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const rear = Math.abs(Math.round(turn / 180)) % 2 === 1;

  useEffect(() => {
    let live = true;
    setTurn(0);
    const hit = cache.current.get(reg);
    if (hit) { setCard(hit); return undefined; }
    setCard({ loading: true });
    api.vehicleCard(reg)
      .then((out) => { cache.current.set(reg, out); if (live) setCard(out); })
      .catch((e) => { if (live) setCard({ error: e.body?.error || 'failed', message: e.message }); });
    return () => { live = false; };
  }, [reg]);

  // The phone's back button closes the card rather than leaving the chat.
  useEffect(() => {
    window.history.pushState({ rcCard: true }, '');
    const pop = () => closeRef.current();
    window.addEventListener('popstate', pop);
    const scroll = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('popstate', pop); document.body.style.overflow = scroll; };
  }, []);
  const close = () => { if (window.history.state?.rcCard) window.history.back(); else closeRef.current(); };
  const flip = (dir) => setTurn((t) => t + dir * 180);
  const go = (d) => {
    const n = index + d;
    if (n < 0 || n >= rows.length) return;
    setEnter(d > 0 ? 'rc-next' : 'rc-prev');
    onIndex(n);
  };
  useEffect(() => {
    const key = (e) => {
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowLeft') flip(-1);
      else if (e.key === 'ArrowRight') flip(1);
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  });

  const onTouchStart = (e) => { const t = e.touches[0]; touch.current = { x: t.clientX, y: t.clientY }; };
  const onTouchEnd = (e) => {
    const s = touch.current; touch.current = null;
    if (!s) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - s.x; const dy = t.clientY - s.y;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.3) flip(dx < 0 ? -1 : 1);
  };

  const v = card.vehicle || {};
  const paid = Boolean(v.paid);
  return (
    <div className="rc-back-drop fixed inset-0 z-40 flex flex-col bg-[#062a27]/80 backdrop-blur-md" role="dialog" aria-modal="true" aria-label={R.title}
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="mx-auto flex w-full max-w-md items-center justify-between px-3 py-3 text-white">
        <button type="button" data-test="rc-back" onClick={close} className="flex items-center gap-1 rounded-full bg-white/15 px-3 py-1.5 text-[13px] font-bold active:scale-95">‹ {R.back}</button>
        <span className="text-[12px] font-semibold text-white/75">{index + 1} / {rows.length}</span>
      </div>

      <div className="flex flex-1 items-center justify-center px-4">
        <div key={reg} className={`${enter} rc-stage w-full max-w-[380px]`}>
          <div className="rc-turn h-[min(64dvh,540px)] w-full" style={{ transform: `rotateY(${turn}deg)` }}
            onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} data-test="rc-card">
            <div className="rc-face overflow-hidden rounded-[22px] bg-white shadow-2xl" aria-hidden={rear}>
              <RcFront card={card} v={v} reg={reg} L={L} onRecheck={(r) => { close(); onRecheck(r); }} />
            </div>
            <div className="rc-face rc-rear overflow-hidden rounded-[22px] bg-white shadow-2xl" aria-hidden={!rear}>
              <RcRear card={card} v={v} L={L} onBuy={() => { close(); onBuy(reg, card.price_paise); }} />
            </div>
          </div>
        </div>
      </div>

      {/* Small downloads for a paid vehicle (user, 2026-10-08). */}
      <div className="mx-auto flex h-10 w-full max-w-md items-center justify-center gap-2 px-3">
        {paid && card.report ? (
          <button type="button" data-test="rc-dl-report" disabled={!card.report.downloadable} onClick={() => onDownload('report', card.report)}
            className="gp-pop rounded-full bg-[#ffd84d] px-3 py-1.5 text-[12px] font-black text-[#0a4f49] shadow active:scale-95 disabled:opacity-50">⬇ {R.report}</button>
        ) : null}
        {paid && card.invoice ? (
          <button type="button" data-test="rc-dl-invoice" disabled={!card.invoice.downloadable} onClick={() => onDownload('invoice', card.invoice)}
            className="gp-pop rounded-full bg-white px-3 py-1.5 text-[12px] font-bold text-[#0a4f49] shadow active:scale-95 disabled:opacity-50" style={{ animationDelay: '.07s' }}>⬇ {R.invoice}</button>
        ) : null}
      </div>

      <div className="mx-auto grid w-full max-w-md grid-cols-3 items-center gap-2 px-3 pb-4 pt-1">
        <button type="button" data-test="rc-prev" onClick={() => go(-1)} disabled={index === 0}
          className="rounded-full bg-white/15 py-2.5 text-[13px] font-bold text-white active:scale-95 disabled:opacity-30">‹ {R.prev}</button>
        <button type="button" data-test="rc-flip" onClick={() => flip(1)}
          className="rounded-full bg-white py-2.5 text-[13px] font-black text-[#0a4f49] shadow active:scale-95">⟲ {R.flipBtn}</button>
        <button type="button" data-test="rc-next" onClick={() => go(1)} disabled={index >= rows.length - 1}
          className="rounded-full bg-white/15 py-2.5 text-[13px] font-bold text-white active:scale-95 disabled:opacity-30">{R.next} ›</button>
      </div>
    </div>
  );
}

/* The card's coloured top: title, holographic sheen and the number plate. */
function RcHead({ v, reg, R, side }) {
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-[#0a4f49] via-[#0f766e] to-[#14a08f] px-4 pb-4 pt-3 text-white">
      <div className="rc-holo pointer-events-none absolute inset-0" />
      <div className="relative flex items-start justify-between gap-2">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[.18em] text-white/70">{side}</div>
          <div className="text-[15px] font-black leading-tight">{R.title}</div>
          <div className="text-[10.5px] text-white/70">{R.sub}</div>
        </div>
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-[11px] font-black text-[#0f766e] shadow">GP</div>
      </div>
      <div className="relative mt-3 inline-flex items-stretch overflow-hidden rounded-lg border-[3px] border-[#111] bg-white shadow-md">
        <span className="flex w-6 flex-col items-center justify-center bg-[#1d4ed8] text-[7px] font-black leading-none text-white"><span className="mb-0.5 text-[9px]">✦</span>IND</span>
        <span className="px-2.5 py-1 font-mono text-[19px] font-black tracking-[2.5px] text-[#111]">{prettyPlate(v.reg_no || reg)}</span>
      </div>
    </div>
  );
}

const Field = ({ k, v, wide = false }) => (v == null || v === '' ? null : (
  <div className={wide ? 'col-span-2' : ''}>
    <div className="text-[9.5px] font-bold uppercase tracking-wider text-black/40">{k}</div>
    <div className="truncate text-[13px] font-semibold text-[#0b2e2b]">{v}</div>
  </div>
));

function RcFront({ card, v, reg, L, onRecheck }) {
  const R = L.rc;
  if (card.loading || card.error) {
    return (
      <div className="flex h-full flex-col">
        <RcHead v={v} reg={reg} R={R} side="1 / 2" />
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center text-[13.5px] text-[#0b2e2b]">
          {card.loading ? (
            <>
              <div className="flex gap-1.5">{[0, 1, 2].map((i) => <span key={i} className="gp-dot h-2.5 w-2.5 rounded-full bg-[#0f766e]" style={{ animationDelay: `${i * 0.18}s` }} />)}</div>
              <div className="text-black/50">{R.loading}</div>
            </>
          ) : (
            <>
              <div>{card.error === 'no_record' ? R.noRecord : `⚠️ ${card.message}`}</div>
              <button type="button" onClick={() => onRecheck(reg)} className="rounded-full bg-[#0f766e] px-4 py-2 text-[13px] font-bold text-white active:scale-95">🔍 {R.recheck}</button>
            </>
          )}
        </div>
      </div>
    );
  }
  const id = v.identity || {};
  const own = v.ownership || {};
  const f = v.found || {};
  const attention = v.paid
    ? (v.documents || []).filter((d) => d.state !== 'valid').length + (v.challans?.pending_count ? 1 : 0)
    : f.needs_attention ?? ((f.expired?.length || 0) + (f.due_soon?.length || 0) + (f.challans_pending ? 1 : 0));
  return (
    <div className="flex h-full flex-col">
      <RcHead v={v} reg={reg} R={R} side="1 / 2" />
      <div className="flex-1 overflow-y-auto px-4 py-3">
        <div className="text-[17px] font-black leading-tight text-[#0b2e2b]">{[id.maker, id.model].filter(Boolean).join(' · ') || '—'}</div>
        <div className="mb-3 text-[12px] text-black/55">{[id.fuel, id.vehicle_class].filter(Boolean).join(' · ')}</div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
          {v.paid ? (
            <>
              <Field wide k={R.owner} v={own.owner_masked ? `${own.owner_masked}${own.owner_serial != null ? ` · ${R.ownerNo} ${own.owner_serial}` : ''}` : null} />
              <Field k={R.regDate} v={id.reg_date ? day(id.reg_date) : null} />
              <Field k={R.rto} v={id.registered_at} />
              <Field k={R.colour} v={id.colour} />
              <Field k={R.mfg} v={id.manufactured} />
              <Field k={R.cc} v={Number(id.cubic_capacity) > 0 ? id.cubic_capacity : null} />
              <Field k={R.seats} v={Number(id.seats) > 0 ? id.seats : null} />
              <Field k={R.norms} v={id.norms} />
              <Field k={R.status} v={id.rc_status} />
              <Field k={R.chassis} v={own.chassis_masked} />
              <Field k={R.engine} v={own.engine_masked} />
            </>
          ) : null}
        </div>
        {!v.paid && v.detail !== 'none' ? (
          <div className="mt-1 space-y-1 text-[13px]">
            <div className="font-semibold text-[#0b2e2b]">{R.attention(attention)}</div>
            {f.expired?.length > 0 && <div className="flex items-center gap-1.5 text-[#c62828]"><Mark state="expired" small />{L.expired}: {f.expired.join(', ')}</div>}
            {f.due_soon?.length > 0 && <div className="flex items-center gap-1.5 text-[#b26a00]"><Mark state="due" small />{L.dueSoon}: {f.due_soon.join(', ')}</div>}
          </div>
        ) : null}
        {v.paid ? <div className="mt-3 text-[12.5px] font-semibold" style={{ color: attention ? '#b26a00' : '#12813f' }}>{attention ? `⚠️ ${attention} need attention` : '✅ All in order'}</div> : null}
        {card.mine?.check_count ? <div className="mt-3 text-[11px] text-black/45">{R.checks(card.mine.check_count)}{card.mine.watched ? ' · 🔔' : ''}</div> : null}
        {v.checked_at ? <div className="text-[11px] text-black/45">{R.fresh(day(v.checked_at))}</div> : null}
        {v.limited ? <div className="mt-2 rounded-lg bg-[#fff4e0] p-2 text-[11.5px] text-[#8f5600]">Today's limit of full views is reached — your PDF report is still downloadable.</div> : null}
      </div>
      <div className="border-t border-black/5 py-2 text-center text-[11px] font-semibold text-[#0f766e]">{R.flip}</div>
    </div>
  );
}

function RcRear({ card, v, L, onBuy }) {
  const R = L.rc;
  const head = (
    <div className="flex items-center justify-between bg-gradient-to-r from-[#0a4f49] to-[#0f766e] px-4 py-3 text-white">
      <div><div className="text-[10px] font-bold uppercase tracking-[.18em] text-white/70">2 / 2</div><div className="text-[14px] font-black">{v.reg_no ? prettyPlate(v.reg_no) : ''}</div></div>
      <div className="grid h-8 w-8 place-items-center rounded-full bg-white text-[10px] font-black text-[#0f766e]">GP</div>
    </div>
  );
  if (card.loading || card.error) return <div className="flex h-full flex-col">{head}</div>;

  if (!v.paid) {
    // Not paid (option a, 2026-10-08): the shape of the answers, blurred, and the offer.
    const ghost = ['Insurance', 'PUC', 'Road tax', 'Fitness', 'Permit', 'Challans', 'Loan', 'Owners'];
    return (
      <div className="relative flex h-full flex-col">
        {head}
        <div className="flex-1 select-none space-y-2 px-4 py-3 blur-[5px]" aria-hidden="true">
          {ghost.map((g, i) => (
            <div key={g} className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-[13px] text-[#0b2e2b]"><Mark state={i % 3 === 0 ? 'due' : 'valid'} />{g}</span>
              <span className="rounded-full bg-[#e7f6ec] px-2 py-0.5 text-[11px] font-bold text-[#12813f]">██ ███ 20██</span>
            </div>
          ))}
        </div>
        <div className="absolute inset-x-0 bottom-0 top-[60px] flex flex-col items-center justify-center gap-2 bg-white/40 p-6 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-full bg-[#0f766e] text-[24px] shadow-lg">🔒</div>
          <div className="text-[14.5px] font-black text-[#0b2e2b]">{R.lockedH}</div>
          <div className="text-[12.5px] text-black/60">{R.lockedP}</div>
          {card.can_buy !== false ? (
            <button type="button" data-test="rc-unlock" onClick={onBuy}
              className="gp-shine mt-1 rounded-full bg-[#ffd84d] px-5 py-2.5 text-[14px] font-black text-[#0a4f49] shadow-md active:scale-95">{R.unlock(rupee(card.price_paise))}</button>
          ) : null}
        </div>
      </div>
    );
  }

  const docs = v.documents || [];
  const ch = v.challans || {};
  const own = v.ownership || {};
  return (
    <div className="flex h-full flex-col">
      {head}
      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
        <div>
          <div className="mb-1 text-[10.5px] font-bold uppercase tracking-wider text-[#0f766e]">📋 {R.docs}</div>
          {docs.map((d) => (
            <div key={d.label} className="flex items-center justify-between gap-2 py-0.5">
              <span className="flex min-w-0 items-center gap-1.5 text-[12.5px] text-[#0b2e2b]"><Mark state={d.state} small /><span className="truncate">{d.name || d.label}</span></span>
              <span className="shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-bold" style={{ color: STATE[d.state]?.[0], background: STATE[d.state]?.[1] }}>{d.valid_until ? day(d.valid_until) : L.daysLeft(d.days)}</span>
            </div>
          ))}
        </div>
        <div>
          <div className="mb-1 text-[10.5px] font-bold uppercase tracking-wider text-[#0f766e]">🚨 {R.challans}</div>
          {ch.pending_count ? (
            <>
              <div className="flex items-center gap-1.5 text-[12.5px] font-bold text-[#c62828]"><Mark state="expired" small />{L.pendingAmt(ch.pending_count, inr(ch.pending_amount_paise))}</div>
              {(ch.pending || []).slice(0, 3).map((c, i) => (
                <div key={c.challan_no || i} className="mt-1 rounded-lg bg-[#fdecea]/60 px-2 py-1 text-[11.5px]">
                  <div className="flex justify-between gap-2 font-semibold text-[#0b2e2b]"><span className="truncate">{c.offence || 'Challan'}</span><span>{inr(c.amount_paise)}</span></div>
                  <div className="truncate text-black/50">{[c.place, c.date ? day(c.date) : null].filter(Boolean).join(' · ')}</div>
                </div>
              ))}
            </>
          ) : <div className="flex items-center gap-1.5 text-[12.5px] font-semibold text-[#12813f]"><Mark state="valid" small />{L.noChallans}</div>}
        </div>
        <div>
          <div className="mb-1 text-[10.5px] font-bold uppercase tracking-wider text-[#0f766e]">🏦 {R.loan}</div>
          <Row k={R.loan} v={own.financer || L.noLoan} tone={own.financer ? 'due' : 'valid'} />
          {own.blacklist_status ? <Row k={L.blacklist} v={own.blacklist_status} tone="expired" /> : null}
        </div>
        {v.fastag ? (
          <div>
            <div className="mb-1 text-[10.5px] font-bold uppercase tracking-wider text-[#0f766e]">🛣 {R.fastag}</div>
            <Row k={v.fastag.active ? 'Active' : 'Not active'} v={v.fastag.balance != null ? inr(Number(v.fastag.balance) * 100) : ''} tone={v.fastag.active ? 'valid' : 'expired'} />
          </div>
        ) : null}
      </div>
      <div className="border-t border-black/5 py-2 text-center text-[11px] font-semibold text-[#0f766e]">{R.flip}</div>
    </div>
  );
}

function DocsList({ kind, rows, L, onDownload }) {
  const reports = kind === 'reports';
  return (
    <div className="anim-up flex flex-col items-start">
      <div className="w-[94%] max-w-md overflow-hidden rounded-2xl rounded-bl-md bg-white shadow-md">
        <div className="px-3.5 pt-3 text-[14px] font-bold text-[#0b2e2b]">{reports ? L.yourReports(rows.length) : L.yourInvoices(rows.length)}</div>
        {rows.map((r) => (
          <div key={r.id} className="mt-2 flex items-center gap-3 border-t border-black/5 px-3.5 py-2.5">
            <div className="grid h-10 w-9 shrink-0 place-items-center rounded-md bg-[#e53935] text-[10px] font-black text-white">PDF</div>
            <div className="min-w-0 flex-1 text-[12.5px]">
              <div className="truncate font-semibold text-[#0b2e2b]">{reports ? r.report_number : r.invoice_number}{r.reg_no ? ` · ${prettyPlate(r.reg_no)}` : ''}</div>
              <div className="text-black/50">
                {reports ? (r.downloadable ? L.reportValid(day(r.valid_until)) : L.reportExpired) : `${day(r.invoice_date)} · ${inr(r.total_paise)}`}
              </div>
            </div>
            <button type="button" data-test={`pdf-${r.id}`} onClick={() => onDownload(r)} disabled={!r.downloadable}
              className="shrink-0 rounded-full bg-[#0f766e] px-3 py-1.5 text-[11.5px] font-bold text-white disabled:opacity-40">⬇ PDF</button>
          </div>
        ))}
      </div>
    </div>
  );
}

/*
 * THE PROFILE (user, 2026-10-07: "the profile must be editable, and the button at
 * the end must be Update, not Sign out — that is confusing"). One form:
 *   Name     typed and saved with Update ('-' when there is none)
 *   Email    confirmed with a six-digit code (components/EmailVerify)
 *   Mobile   Change number → a warning that the old number's vehicles and reports
 *            stay with it (a transfer can be asked for, which support approves) →
 *            a code to the new number → signed in again on it
 *   Tips & offers, by SMS / email
 * Sign out and Deactivate live in the ⋮ menu, each with its own warning.
 */
function ProfileCard({ user, L, onPromo, onSaveName, onVerified, onSwitched }) {
  const [promo, setPromo] = useState(Boolean(user?.promo_consent));
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState(user?.name || user?.display_name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [note, setNote] = useState(null);
  const [mob, setMob] = useState(null);       // null | { stage: 'warn' | 'code', mobile, code, transfer, why }
  const m = String(user?.mobile || '').slice(-10);
  const verified = user?.email_verified ? user.email : null;
  const nameChanged = name.trim().replace(/\s+/g, ' ') !== String(user?.name || '').trim();

  const update = async () => {
    const n = name.trim().replace(/\s+/g, ' ');
    if (!/^[\p{L}\p{M}][\p{L}\p{M} .'-]{1,59}$/u.test(n)) { setNote({ tone: 'bad', text: L.badName }); return; }
    setBusy(true); setNote(null);
    try { await onSaveName(n); setNote({ tone: 'good', text: L.saved }); }
    catch (err) { setNote({ tone: 'bad', text: err.message }); }
    finally { setBusy(false); }
  };
  const mobileStep = async () => {
    setBusy(true); setNote(null);
    try {
      if (mob.stage === 'warn') {
        await api.mobileCode(mob.mobile);
        setMob({ ...mob, stage: 'code', code: '' });
      } else {
        const out = await api.mobileChange(mob.mobile, mob.code, mob.transfer, mob.why);
        setMob(null);
        onSwitched?.(out);
      }
    } catch (err) { setNote({ tone: 'bad', text: err.message }); }
    finally { setBusy(false); }
  };
  const field = 'mt-0.5 w-full rounded-xl border border-black/10 bg-[#f6f9f9] px-3 py-2.5 text-[14px] text-[#0b2e2b] outline-none focus:border-[#0f766e]';

  return (
    <div className="anim-up flex flex-col items-start">
      <div className="w-[94%] max-w-md overflow-hidden rounded-2xl rounded-bl-md bg-white shadow-md">
        <div className="flex items-center gap-3 bg-gradient-to-r from-[#0f766e] to-[#14a08f] px-4 py-3 text-white">
          <div className="grid h-11 w-11 place-items-center rounded-full bg-white/20 text-[18px] font-black">{(user?.name || '-').slice(0, 1).toUpperCase()}</div>
          <div className="min-w-0"><div className="truncate text-[15px] font-bold">{user?.name || '-'}</div><div className="text-[12px] text-white/85">{m ? `${m.slice(0, 5)} ${m.slice(5)}` : '-'}</div></div>
        </div>
        <div className="space-y-3 px-4 py-3">
          <label className="block text-[11px] font-semibold text-black/50">{L.nameL}
            <input data-test="profile-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} autoComplete="name" placeholder={L.placeholderName} className={field} />
          </label>
          <div className="text-[11px] font-semibold text-black/50">{L.emailL}
            <div className="mt-0.5"><EmailVerify email={email} onEmail={setEmail} verifiedEmail={verified} onVerified={onVerified} inputClass={field.replace('mt-0.5 w-full ', '')} dataTest="profile" /></div>
            {!verified ? <div className="mt-1 font-normal text-[#8f5600]">{user?.email ? L.emailWait : L.emailNone}</div> : null}
          </div>
          <div className="text-[11px] font-semibold text-black/50">{L.mobileL}
            <div className="mt-0.5 flex items-center justify-between rounded-xl border border-black/10 bg-[#f6f9f9] px-3 py-2.5 text-[14px] text-[#0b2e2b]">
              <span className="tabular-nums">{m ? `${m.slice(0, 5)} ${m.slice(5)}` : '-'}</span>
              {!mob ? <button type="button" data-test="profile-change-mobile" onClick={() => { setMob({ stage: 'warn', mobile: '', code: '', transfer: true, why: '' }); setNote(null); }}
                className="text-[12.5px] font-bold text-[#0f766e]">{L.changeNumber}</button> : null}
            </div>
          </div>
          {mob ? (
            <div className="space-y-2 rounded-xl border border-[#e08700]/40 bg-[#fff6e6] p-3 text-[12.5px] text-[#5c3a00]">
              <div className="font-bold">⚠️ {L.changeWarnH}</div>
              <div className="leading-snug">{L.changeWarn}</div>
              <input data-test="profile-new-mobile" className={field} inputMode="numeric" maxLength={10} disabled={mob.stage === 'code'} placeholder={L.placeholderMobile}
                value={mob.mobile} onChange={(e) => setMob({ ...mob, mobile: e.target.value.replace(/\D/g, '').slice(0, 10) })} />
              <label className="flex items-start gap-2"><input type="checkbox" className="mt-0.5 h-4 w-4 accent-[#0f766e]" checked={mob.transfer} disabled={mob.stage === 'code'}
                onChange={(e) => setMob({ ...mob, transfer: e.target.checked })} /><span>{L.transferAsk}</span></label>
              {mob.transfer && mob.stage === 'warn' ? <input className={field} maxLength={300} placeholder={L.transferNote} value={mob.why} onChange={(e) => setMob({ ...mob, why: e.target.value })} /> : null}
              {mob.stage === 'code' ? <input data-test="profile-mobile-code" className={`${field} tracking-[0.3em]`} inputMode="numeric" autoComplete="one-time-code" maxLength={6}
                placeholder={L.placeholderCode} value={mob.code} onChange={(e) => setMob({ ...mob, code: e.target.value.replace(/\D/g, '') })} /> : null}
              <div className="flex gap-2">
                <button type="button" data-test="profile-mobile-next" disabled={busy || (mob.stage === 'warn' ? !/^[6-9]\d{9}$/.test(mob.mobile) : mob.code.length < 4)} onClick={mobileStep}
                  className="flex-1 rounded-xl bg-[#0f766e] py-2.5 text-[13px] font-bold text-white disabled:opacity-40">{busy ? '…' : mob.stage === 'warn' ? L.sendCode : L.verifySwitch}</button>
                <button type="button" disabled={busy} onClick={() => setMob(null)} className="rounded-xl border border-black/10 px-4 text-[13px] font-bold text-[#0b2e2b]">{L.cancel}</button>
              </div>
              <div className="text-[11.5px]">{L.transferHelp}</div>
            </div>) : null}
          {note ? <div className={`rounded-lg px-3 py-2 text-[12.5px] ${note.tone === 'good' ? 'bg-[#e9f8ef] text-[#0a6c34]' : 'bg-[#fdecec] text-[#912018]'}`}><Text text={note.text} /></div> : null}
          <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl bg-[#f3f7f6] px-3 py-2.5 text-[13px]">
            <span className="text-[#0b2e2b]">{L.offers}</span>
            <input type="checkbox" data-test="profile-offers" className="h-5 w-5 accent-[#0f766e]" checked={promo} disabled={busy}
              onChange={async (e) => { const agree = e.target.checked; setPromo(agree); setBusy(true); try { await onPromo(agree); } catch { setPromo(!agree); } finally { setBusy(false); } }} />
          </label>
        </div>
        <button type="button" data-test="profile-save" onClick={update} disabled={busy || !nameChanged}
          className="w-full bg-[#0f766e] py-3.5 text-[14.5px] font-black text-white disabled:bg-[#0f766e]/40">{busy ? '…' : `✓ ${L.update}`}</button>
      </div>
    </div>
  );
}

function Divider({ children }) {
  return (
    <div className="my-2 flex items-center gap-2 text-[11px] font-semibold text-[#0a4f49]/70">
      <span className="h-px flex-1 bg-[#0f766e]/15" /><span className="rounded-full bg-white/80 px-2.5 py-0.5 shadow-sm">{children}</span><span className="h-px flex-1 bg-[#0f766e]/15" />
    </div>
  );
}

function Bubble({ item, onChip, chipLabel, faded = false }) {
  const mine = item.from === 'me';
  if (item.kind === 'typing') {
    return (
      <div className="gp-pop gp-from-l flex" aria-label="typing">
        <div className="gp-bot flex items-center gap-1.5 rounded-2xl rounded-bl-md px-4 py-3.5 shadow-sm">
          {[0, 1, 2].map((i) => <span key={i} className="gp-dot h-2 w-2 rounded-full bg-[#0f766e]" style={{ animationDelay: `${i * 0.18}s` }} />)}
        </div>
      </div>
    );
  }
  if (item.kind === 'note') return <div className="mx-auto text-[11px] text-black/40">{item.text}</div>;
  /* A vehicle number they sent, drawn as an Indian number plate (2026-10-07):
     white plate, black border and letters, the blue "IND" strip on the left. */
  if (item.kind === 'plate') {
    return (
      <div className="gp-pop flex flex-col items-end">
        <div className="flex items-stretch overflow-hidden rounded-lg border-[3px] border-[#111] bg-white shadow-md">
          <span className="flex w-7 flex-col items-center justify-center bg-[#1d4ed8] text-[8px] font-black leading-none text-white">
            <span className="mb-0.5 text-[10px]">✦</span>IND
          </span>
          <span className="px-3 py-1.5 font-mono text-[20px] font-black tracking-[3px] text-[#111]">{item.text}</span>
        </div>
        <div className="mt-0.5 pr-1 text-[10px] text-black/40">{time(item.at)}</div>
      </div>
    );
  }
  const welcome = item.kind === 'welcome';
  return (
    <div className={`flex flex-col ${mine ? 'items-end' : 'items-start'} ${faded ? 'opacity-75' : `gp-pop ${mine ? 'gp-from-r' : 'gp-from-l'}`}`}>
      <div className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-[14.5px] leading-snug shadow-sm ${mine
        ? 'gp-me rounded-br-md text-white'
        : welcome ? 'rounded-bl-md border border-[#ffd84d] bg-gradient-to-br from-white to-[#fff8d6] text-[#0b2e2b]'
          : 'gp-bot rounded-bl-md text-[#0b2e2b]'}`}>
        {item.label && <div className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-[#0f766e]">📣 {item.label}</div>}
        {item.kind === 'file'
          ? <FileLine item={item} />
          : <Text text={item.text} />}
        <div className={`mt-0.5 text-right text-[10px] ${mine ? 'text-white/70' : 'text-black/35'}`}>{time(item.at)}{faded ? ' · WhatsApp' : ''}</div>
      </div>
      {item.chips?.length > 0 && (
        <div className={`mt-1.5 flex max-w-[90%] flex-wrap gap-1.5 ${mine ? 'justify-end' : ''} ${faded ? '' : 'gp-chips'}`}>
          {/* Old WhatsApp buttons are shown as plain labels — never tappable, never mistaken for real ones. */}
          {item.chips.map((c, i) => (faded
            ? <span key={c} className="rounded-full border border-black/10 bg-white/50 px-3 py-1 text-xs font-semibold text-black/40">{c}</span>
            : (
              <button key={c} type="button" data-test={`chip-${c}`} onClick={() => onChip(c)} style={{ '--i': i }}
                className="rounded-full border border-[#0f766e]/30 bg-white px-3 py-1 text-xs font-semibold text-[#0f766e] shadow-sm active:scale-95">
                {chipLabel(c)}
              </button>
            )))}
        </div>
      )}
    </div>
  );
}

function FileLine({ item }) {
  const f = item.file || {};
  const href = f.type === 'report' ? '/app/reports' : f.type === 'invoice' ? '/app/invoices' : null;
  return (
    <div>
      <div className="flex items-center gap-2.5 rounded-xl bg-[#f3f7f6] p-2">
        <div className="grid h-10 w-9 shrink-0 place-items-center rounded-md bg-[#e53935] text-[10px] font-black text-white">PDF</div>
        <div className="min-w-0 text-[13px]"><Text text={item.text} /></div>
      </div>
      {href && <Link to={href} className="mt-1.5 block text-center text-[13px] font-semibold text-[#0f766e]">Open in GaadiPe ›</Link>}
    </div>
  );
}

/** The vehicle as a card — the free view, honest about what is locked. */
function VehicleCard({ it, L, onFull, onAnother }) {
  // A signed-in check of a vehicle they own a report for comes back full: open it in the chat.
  const v = it.vehicle || {};
  const id = v.identity || {};
  const f = v.found || {};
  const attention = f.needs_attention ?? ((f.expired?.length || 0) + (f.due_soon?.length || 0) + (f.challans_pending ? 1 : 0));
  const ring = attention === 0 ? '#12a150' : attention <= 2 ? '#eda100' : '#d92d20';
  /* Make and model only (free_view_detail 'none', 2026-10-08): nothing was
     checked for the customer to see, so no "nothing needs attention" and no
     green 0 — a lock and what signing in shows instead. */
  const identityOnly = !it.paid && v.detail === 'none';
  return (
    <div className="anim-up flex flex-col items-start">
      <div className="w-[92%] max-w-sm overflow-hidden rounded-2xl rounded-bl-md bg-white shadow-md">
        <div className="bg-gradient-to-br from-[#0f766e] to-[#0a4f49] p-3.5 text-white">
          <div className="flex items-center justify-between gap-3">
            <span className="rounded-md border-2 border-black bg-white px-2.5 py-0.5 font-mono text-[17px] font-black tracking-[2px] text-black shadow">
              {prettyPlate(v.reg_no)}
            </span>
            {identityOnly ? (
              <span className="grid h-11 w-11 place-items-center rounded-full bg-white/15 text-[20px]" aria-label="details locked">🔒</span>
            ) : (
              <span className="grid h-11 w-11 place-items-center rounded-full text-[15px] font-black" style={{ background: `conic-gradient(${ring} 100%, transparent 0)` }}>
                <span className="grid h-8 w-8 place-items-center rounded-full bg-[#0a4f49] text-white">{attention}</span>
              </span>
            )}
          </div>
          <div className="mt-2 text-[15px] font-bold">{[id.maker, id.model].filter(Boolean).join(' · ') || '—'}</div>
          <div className="text-[12px] text-white/80">{[id.fuel, id.vehicle_class].filter(Boolean).join(' · ')}</div>
        </div>
        {v.rto ? <RtoLine rto={v.rto} L={L} /> : null}
        <div className="space-y-1.5 p-3.5 text-[13.5px] text-[#0b2e2b]">
          {it.paid ? <div className="font-semibold text-[#12813f]">{L.youHave}</div> : v.detail === 'public' ? <PublicFacts v={v} L={L} /> : (
            <>
              {identityOnly
                ? <div><Text text={L.identityOnly(rupee(it.price))} /></div>
                : <div><Text text={L.attention(attention)} /></div>}
              {f.expired?.length > 0 && <div className="text-[#c62828]">● {L.expired}: {f.expired.join(', ')}</div>}
              {f.due_soon?.length > 0 && <div className="text-[#b26a00]">● {L.dueSoon}: {f.due_soon.join(', ')}</div>}
              {f.challans_pending > 0 && <div className="text-[#c62828]">● {L.challans}: {f.challans_pending}</div>}
              {v.locked?.length > 0 && (
                <div className="mt-2 rounded-xl bg-[#f3f7f6] p-2.5">
                  <div className="mb-1 text-[11px] font-bold uppercase tracking-wider text-[#0f766e]">🔒 {L.locked}</div>
                  {v.locked.slice(0, 5).map((x) => <div key={x} className="text-[12.5px] text-black/60">• {x}</div>)}
                </div>
              )}
            </>
          )}
        </div>
        <div className="grid grid-cols-2 border-t border-black/5">
          <button type="button" data-test="card-full" onClick={onFull} className="gp-shine bg-[#ffd84d] py-3 text-[14px] font-black text-[#0a4f49] active:brightness-95">
            {it.paid ? `📄 ${L.open}` : `🔓 ${L.fullReport(rupee(it.price))}`}
          </button>
          <button type="button" data-test="card-another" onClick={onAnother} className="py-3 text-[14px] font-bold text-[#0f766e] active:bg-black/5">🔍 {L.another}</button>
        </div>
      </div>
      {!it.signedIn && !it.paid && !identityOnly && (
        <div className="mt-1.5 max-w-[88%] rounded-xl bg-white/80 px-3 py-2 text-[12px] text-[#0a4f49] shadow-sm">
          {L.signInMore}{typeof it.left === 'number' ? ` ${L.leftToday(it.left)}` : ''}
        </div>
      )}
    </div>
  );
}

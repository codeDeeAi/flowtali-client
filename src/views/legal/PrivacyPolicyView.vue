<script setup lang="ts">
import { useRouter } from 'vue-router'
const router = useRouter()
</script>

<template>
  <div class="min-h-screen bg-charcoal-900 text-cream">

    <!-- Nav -->
    <header class="border-b border-charcoal-800 px-6 py-4 flex items-center justify-between max-w-4xl mx-auto">
      <button @click="router.back()" class="flex items-center gap-2 text-sm text-cream-muted hover:text-cream transition-colors">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
        Back
      </button>
      <router-link to="/" class="font-display text-lg font-bold text-amber">Flowtali</router-link>
    </header>

    <!-- Content -->
    <main class="max-w-4xl mx-auto px-6 py-12">
      <div class="mb-10">
        <h1 class="text-4xl font-bold font-display text-cream mb-3">Privacy Policy</h1>
        <p class="text-cream-faint text-sm">Last updated: May 20, 2026</p>
      </div>

      <div class="prose prose-invert max-w-none space-y-8 text-cream-muted leading-relaxed">

        <section>
          <h2 class="text-xl font-semibold text-cream mb-3">1. Introduction</h2>
          <p>Flowtali ("we", "our", or "us") is committed to protecting your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your data when you use our platform at flowtali.io (the "Service").</p>
          <p class="mt-3">By using Flowtali, you agree to the collection and use of information in accordance with this policy.</p>
        </section>

        <section>
          <h2 class="text-xl font-semibold text-cream mb-3">2. Information We Collect</h2>
          <h3 class="text-base font-semibold text-cream-muted mb-2">Account Information</h3>
          <p>When you register, we collect your name, email address, and password (stored as a secure hash). You may optionally provide a profile photo and phone number.</p>
          <h3 class="text-base font-semibold text-cream-muted mb-2 mt-4">Organization Data</h3>
          <p>When you create an organization, we store the organization name, logo, brand colors, and any client or member data you add to the platform.</p>
          <h3 class="text-base font-semibold text-cream-muted mb-2 mt-4">Usage Data</h3>
          <p>We automatically collect information about how you interact with the Service, including access times, pages viewed, device information, and IP addresses.</p>
          <h3 class="text-base font-semibold text-cream-muted mb-2 mt-4">Uploaded Files</h3>
          <p>Files you upload (logos, signatures, document attachments) are stored securely on cloud infrastructure. We do not read the contents of your documents.</p>
        </section>

        <section>
          <h2 class="text-xl font-semibold text-cream mb-3">3. How We Use Your Information</h2>
          <ul class="list-disc pl-5 space-y-2">
            <li>To provide, operate, and maintain the Service</li>
            <li>To authenticate your identity and manage your account</li>
            <li>To send transactional emails (password resets, email verification, OTPs)</li>
            <li>To improve the Service through anonymized usage analytics</li>
            <li>To comply with legal obligations and enforce our Terms of Service</li>
          </ul>
          <p class="mt-3">We do not sell, rent, or share your personal data with third parties for marketing purposes.</p>
        </section>

        <section>
          <h2 class="text-xl font-semibold text-cream mb-3">4. Data Storage &amp; Security</h2>
          <p>Your data is stored on secure, encrypted servers. We use industry-standard security measures including TLS encryption in transit, hashed passwords (bcrypt), and token-based authentication (Laravel Sanctum).</p>
          <p class="mt-3">Access tokens expire after 24 hours. You can view and revoke active sessions at any time from your profile settings.</p>
          <p class="mt-3">While we take security seriously, no method of transmission over the internet is 100% secure. We cannot guarantee absolute security.</p>
        </section>

        <section>
          <h2 class="text-xl font-semibold text-cream mb-3">5. Data Retention</h2>
          <p>We retain your account data for as long as your account is active. Deleted letterheads are soft-deleted and permanently purged after 30 days. You may request deletion of your account and all associated data at any time by contacting support.</p>
        </section>

        <section>
          <h2 class="text-xl font-semibold text-cream mb-3">6. Cookies</h2>
          <p>Flowtali uses minimal cookies necessary for authentication and session management. We do not use advertising or tracking cookies. You can disable cookies in your browser settings, though this may affect the functionality of the Service.</p>
        </section>

        <section>
          <h2 class="text-xl font-semibold text-cream mb-3">7. Third-Party Services</h2>
          <p>We may use the following third-party services:</p>
          <ul class="list-disc pl-5 space-y-2 mt-2">
            <li><strong class="text-cream">Cloud Storage (AWS S3)</strong> — for storing uploaded files</li>
            <li><strong class="text-cream">Email Provider</strong> — for sending transactional emails</li>
            <li><strong class="text-cream">Google OAuth</strong> — if you choose to sign in with Google</li>
          </ul>
          <p class="mt-3">Each service has its own privacy policy governing their use of your data.</p>
        </section>

        <section>
          <h2 class="text-xl font-semibold text-cream mb-3">8. Your Rights</h2>
          <p>Depending on your jurisdiction, you may have the right to:</p>
          <ul class="list-disc pl-5 space-y-2 mt-2">
            <li>Access the personal data we hold about you</li>
            <li>Request correction of inaccurate data</li>
            <li>Request deletion of your account and data</li>
            <li>Object to or restrict certain processing</li>
            <li>Data portability (receive your data in a machine-readable format)</li>
          </ul>
          <p class="mt-3">To exercise these rights, contact us at <strong class="text-amber">flowtaliltd@gmail.com</strong>.</p>
        </section>

        <section>
          <h2 class="text-xl font-semibold text-cream mb-3">9. Children's Privacy</h2>
          <p>Flowtali is not directed to individuals under the age of 16. We do not knowingly collect personal information from children. If you believe we have inadvertently collected such information, please contact us immediately.</p>
        </section>

        <section>
          <h2 class="text-xl font-semibold text-cream mb-3">10. Changes to This Policy</h2>
          <p>We may update this Privacy Policy from time to time. We will notify you of significant changes by email or a prominent notice in the app. Continued use of the Service after changes constitutes your acceptance of the updated policy.</p>
        </section>

        <section>
          <h2 class="text-xl font-semibold text-cream mb-3">11. Contact Us</h2>
          <p>If you have questions about this Privacy Policy, please contact us:</p>
          <div class="mt-3 p-4 bg-charcoal-800 border border-charcoal-700 rounded-xl text-sm">
            <p><strong class="text-cream">Flowtali</strong></p>
            <p class="mt-1">Email: <a href="mailto:flowtaliltd@gmail.com" class="text-amber hover:underline">flowtaliltd@gmail.com</a></p>
          </div>
        </section>

      </div>
    </main>

    <!-- Footer -->
    <footer class="border-t border-charcoal-800 mt-16 px-6 py-8 text-center">
      <div class="flex items-center justify-center gap-6 text-sm text-cream-faint">
        <router-link :to="{ name: 'privacy' }" class="hover:text-cream transition-colors">Privacy Policy</router-link>
        <router-link :to="{ name: 'terms' }" class="hover:text-cream transition-colors">Terms of Service</router-link>
      </div>
      <p class="text-xs text-cream-faint/50 mt-4">© {{ new Date().getFullYear() }} Flowtali. All rights reserved.</p>
    </footer>
  </div>
</template>

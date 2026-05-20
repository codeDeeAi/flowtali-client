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
        <h1 class="text-4xl font-bold font-display text-cream mb-3">Terms of Service</h1>
        <p class="text-cream-faint text-sm">Last updated: May 20, 2026</p>
      </div>

      <div class="prose prose-invert max-w-none space-y-8 text-cream-muted leading-relaxed">

        <section>
          <h2 class="text-xl font-semibold text-cream mb-3">1. Acceptance of Terms</h2>
          <p>By accessing or using Flowtali ("Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, do not use the Service. These terms apply to all users, including individuals and organization accounts.</p>
        </section>

        <section>
          <h2 class="text-xl font-semibold text-cream mb-3">2. Description of Service</h2>
          <p>Flowtali is a document and letterhead management platform that allows users to create, store, and share professional letterheads and related documents within organizations. Features include:</p>
          <ul class="list-disc pl-5 space-y-2 mt-2">
            <li>Letterhead creation and management</li>
            <li>Client and contact management</li>
            <li>Shared link generation with optional access codes</li>
            <li>Team member management with role-based access</li>
            <li>File uploads for logos, signatures, and documents</li>
          </ul>
        </section>

        <section>
          <h2 class="text-xl font-semibold text-cream mb-3">3. Accounts &amp; Registration</h2>
          <p>To use the Service, you must create an account. You agree to:</p>
          <ul class="list-disc pl-5 space-y-2 mt-2">
            <li>Provide accurate, current, and complete information</li>
            <li>Maintain the security of your account credentials</li>
            <li>Notify us immediately of any unauthorized access to your account</li>
            <li>Be responsible for all activity that occurs under your account</li>
          </ul>
          <p class="mt-3">You must be at least 16 years of age to create an account. By creating an account, you represent that you meet this requirement.</p>
        </section>

        <section>
          <h2 class="text-xl font-semibold text-cream mb-3">4. Acceptable Use</h2>
          <p>You agree not to use the Service to:</p>
          <ul class="list-disc pl-5 space-y-2 mt-2">
            <li>Upload, post, or transmit content that is illegal, fraudulent, or infringes on third-party rights</li>
            <li>Impersonate any person or entity or misrepresent your affiliation with any entity</li>
            <li>Distribute malware, spam, or other harmful software</li>
            <li>Attempt to gain unauthorized access to any portion of the Service or other users' data</li>
            <li>Use the Service in any way that could disable, overburden, or impair its infrastructure</li>
            <li>Scrape, crawl, or systematically extract data from the Service</li>
          </ul>
          <p class="mt-3">We reserve the right to terminate accounts that violate these terms without notice.</p>
        </section>

        <section>
          <h2 class="text-xl font-semibold text-cream mb-3">5. Organizations &amp; Teams</h2>
          <p>When you create an organization on Flowtali, you become the Organization Owner. As Owner, you are responsible for:</p>
          <ul class="list-disc pl-5 space-y-2 mt-2">
            <li>Managing member invitations and role assignments</li>
            <li>All content created or uploaded by your organization members</li>
            <li>Ensuring members comply with these Terms of Service</li>
          </ul>
          <p class="mt-3">Members invited to your organization will have access to resources based on the roles you assign. You may remove members at any time.</p>
        </section>

        <section>
          <h2 class="text-xl font-semibold text-cream mb-3">6. Intellectual Property</h2>
          <p>You retain ownership of all content you upload or create through the Service, including letterheads, logos, and documents ("User Content"). By uploading content, you grant Flowtali a non-exclusive, worldwide, royalty-free license to store, display, and transmit your User Content solely for the purpose of providing the Service.</p>
          <p class="mt-3">Flowtali owns all intellectual property rights in the Service itself, including its software, design, and branding. You may not reproduce, modify, or distribute the Service or its components without our express written permission.</p>
        </section>

        <section>
          <h2 class="text-xl font-semibold text-cream mb-3">7. Shared Links</h2>
          <p>The Service allows you to generate shareable links for letterheads. You are solely responsible for the content shared through these links. Private links with access codes provide an additional layer of security, but you acknowledge that:</p>
          <ul class="list-disc pl-5 space-y-2 mt-2">
            <li>Access codes should be kept confidential</li>
            <li>We are not responsible for unauthorized access resulting from compromised access codes</li>
            <li>You should revoke links when they are no longer needed</li>
          </ul>
        </section>

        <section>
          <h2 class="text-xl font-semibold text-cream mb-3">8. Subscription &amp; Payments</h2>
          <p>Flowtali may offer free and paid subscription tiers. By subscribing to a paid plan, you agree to pay all applicable fees. All fees are non-refundable except where required by law. We reserve the right to modify pricing with 30 days' notice.</p>
          <p class="mt-3">Failure to pay may result in suspension or termination of your account and associated data.</p>
        </section>

        <section>
          <h2 class="text-xl font-semibold text-cream mb-3">9. Disclaimers &amp; Limitation of Liability</h2>
          <p>The Service is provided "as is" without warranties of any kind. We do not guarantee that the Service will be error-free, uninterrupted, or free from security vulnerabilities.</p>
          <p class="mt-3">To the maximum extent permitted by law, Flowtali shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of data, revenue, or goodwill, arising from your use of or inability to use the Service.</p>
        </section>

        <section>
          <h2 class="text-xl font-semibold text-cream mb-3">10. Termination</h2>
          <p>You may close your account at any time from your profile settings. We may suspend or terminate your access if you violate these Terms. Upon termination:</p>
          <ul class="list-disc pl-5 space-y-2 mt-2">
            <li>Your access to the Service will be immediately revoked</li>
            <li>Your data will be retained for 30 days and then permanently deleted</li>
            <li>You may request immediate deletion by contacting support</li>
          </ul>
        </section>

        <section>
          <h2 class="text-xl font-semibold text-cream mb-3">11. Governing Law</h2>
          <p>These Terms are governed by and construed in accordance with applicable law. Any disputes arising under these Terms shall be resolved through binding arbitration or in the courts of the applicable jurisdiction.</p>
        </section>

        <section>
          <h2 class="text-xl font-semibold text-cream mb-3">12. Changes to Terms</h2>
          <p>We reserve the right to modify these Terms at any time. We will notify you of significant changes via email or an in-app notice. Continued use of the Service after changes constitutes your acceptance. If you do not agree with the revised Terms, you must discontinue use of the Service.</p>
        </section>

        <section>
          <h2 class="text-xl font-semibold text-cream mb-3">13. Contact</h2>
          <p>For questions about these Terms, please contact:</p>
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

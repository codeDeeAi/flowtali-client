<script setup lang="ts">
import { useRoute } from 'vue-router'
import InvoiceEditor from './InvoiceEditor.vue'

const route = useRoute()
const projectId = route.query.project_id as string | undefined
</script>

<template>
  <InvoiceEditor mode="create" :project-id="projectId" />
</template>
